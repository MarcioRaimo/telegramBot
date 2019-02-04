import fs from 'fs';

export default class Database {

    Data:DB;

    constructor() {
        this.Data = JSON.parse(fs.readFileSync(`${__dirname}/db.json`, {
            encoding: 'utf-8'
        }));
    }

    getDatabase(): DB {
        return this.Data;
    }

    searchSession(session: string): Session | null {
        let temp: Session = null;
        for (let i = 0; i < this.Data.length; i++) {
            if (this.Data[i].session_id === session) {
                temp = this.Data[i];
            }
        }
        return temp;
    }

    searchChat(chat: number): Session | null {
        let temp: Session = null;
        for (let i = 0; i < this.Data.length; i++) {
            if (this.Data[i].chat_id === chat) {
                temp = this.Data[i];
            }
        }
        return temp;
    }

    createSession(session: Session): void {
        this.Data.push(session);
        fs.writeFileSync(`${__dirname}/db.json`, JSON.stringify(this.Data));
    }

    deleteSession(session: string): void {
        for (let i = 0; i < this.Data.length; i++) {
            if (this.Data[i].session_id === session) {
                this.Data.splice(i);
                break;
            }
        }
        fs.writeFileSync(`${__dirname}/db.json`, JSON.stringify(this.Data));
    }

    updateSession(session: string, data: any): void {
        for (let i = 0; i < this.Data.length; i++) {
            if (this.Data[i].session_id === session) {
                this.Data[i] = Object.assign(this.Data[i], data);
                break;
            }
        }
        fs.writeFileSync(`${__dirname}/db.json`, JSON.stringify(this.Data));
    }
}

type DB = Session[];

type Session = {
    session_id: string;
    chat_id: number;
    entity?: string;
}