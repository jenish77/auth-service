const config = require("config")
import { Sequelize } from "sequelize-typescript";

export class SequelizeDbHelper {
    private static instance: SequelizeDbHelper
    private readonly sequelize: Sequelize

    private constructor() {
        this.sequelize = new Sequelize({
            dialect: 'mysql',
            host: config.get("MYSQL_HOST"),
            username: config.get("MYSQL_USERNAME"),
            password: config.get("MYSQL_PASSWORD"),
            database: config.get("MYSQL_DBNAME"),
            logging: false,
            pool: {
                max: 10,
                min: 0,
                acquire: 100 * 1000,
                idle: 10000
            },
        } as any); // Using 'as any' to avoid strict type checking for now
    }

    public static getInstance(): SequelizeDbHelper {
        if (!SequelizeDbHelper.instance) {
            SequelizeDbHelper.instance = new SequelizeDbHelper();
        }

        return SequelizeDbHelper.instance;
    }

    public getSequelizeClint() {
        return this.sequelize
    }

}
