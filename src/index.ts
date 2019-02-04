// import axios from 'axios';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { AssistantV2 } from 'watson-developer-cloud';
import Axios from 'axios';
import Config from './config.json';
import Db from './database';

console.log('isMainThread', isMainThread);

const Bot = new TelegramBot(Config.bot_key, {
    polling: isMainThread ? {
        autoStart: true,
        interval: 1000,
        params: {
            timeout: 10
        }
    } : false
});

const Assistant = new AssistantV2({
    iam_apikey: Config.IBM_apiKey,
    version: Config.IBM_version
});

if (isMainThread) {

    Bot.on('message', (message) => {
        const Database = new Db();
        let session = Database.searchChat(message.chat.id);
        console.log('---------------------------------------------')
        console.log('session', session);
        console.log('---------------------------------------------')

        if (session == null) {
            Assistant.createSession({
                assistant_id: Config.assistant_id
            }, (error, response) => {
                if (error) {
                    throw new Error(error);
                }
                Database.createSession({
                    chat_id: message.chat.id,
                    session_id: response.session_id
                });
                new Worker(__filename, {
                    workerData: {
                        message,
                        session: {
                            chat_id: message.chat.id,
                            session_id: response.session_id
                        }
                    }
                });
            });
        } else {
            new Worker(__filename, {
                workerData: {
                    message,
                    session
                }
            });
        }
    });

} else {

    const Database = new Db();
    const data: myData = workerData;
    let text = null;
    let needAssistant = true;

    if (data.message.location) {
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${Config.google_key}&location=${data.message.location.latitude},${data.message.location.longitude}&radius=5000&keyword=${data.session.entity}`;
        text = `Lat: ${data.message.location.latitude} // Long: ${data.message.location.longitude}`;
        Axios.get(url).then((response) => {
            let location = response.data.results[0].geometry.location;
            Bot.sendMessage(data.session.chat_id, `A concessionária mais próxima da ${data.session.entity}: ${response.data.results[0].vicinity}`);
            Bot.sendLocation(data.session.chat_id, location.lat, location.lng);
        });
    } else if (data.message.text) {
        text = data.message.text;
        Assistant.message({
            assistant_id: Config.assistant_id,
            session_id: data.session.session_id,
            input: {
                text
            }
        }, (error, response) => {
            if (error) {
                console.log('error', error);
                Database.deleteSession(data.session.session_id);
                Bot.sendMessage(data.session.chat_id, "Olá, como posso te ajudar?")
            } else {
                let entity = null;
                if (response.output.entities.length > 0) {
                    entity = response.output.entities[0].value
                }
                Database.updateSession(data.session.session_id, { entity })
                for (let i = 0; i < response.output.generic.length; i++) {
                    sendMessage(data.session.chat_id, response.output.generic[i].text, i * 1000);
                }
            }
        });
    }

}

function sendMessage(chat_id: string, text: string, timeout: number) {
    setTimeout(() => {
        Bot.sendMessage(chat_id, text);
    }, timeout);
}

interface myData {
    message: Message,
    session: {
        session_id: string,
        chat_id: string,
        entity?: string
    }
}