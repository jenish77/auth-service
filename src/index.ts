var morgan = require('morgan');
import redisClient from "../src/utils/redisHelper";
import { User } from './components/users/models/userModel';
import {SequelizeDbHelper} from "../sequlizeDB"
const { Sequelize } = require('sequelize');
const config = require("config")
const express = require('express')
const bodyParser = require('body-parser')
const cors = require("cors");
const cookieParser = require("cookie-parser");
require('dotenv').config()

import userRoute from "./components/users";
import {NextFunction, Request, Response} from "express";

let connectedUsers: any = {};

let sequelizeDbHelper = SequelizeDbHelper.getInstance()
let sequelizeClient = sequelizeDbHelper.getSequelizeClint()

express.application.prefix = express.Router.prefix = function (path: any, configure: any) {
    var router = express.Router();
    this.use(path, router);
    configure(router);
    return router;
};

const app = express()

app.use(function (req: Request, res: Response, next: NextFunction) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.use(cookieParser());


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




// app.use('/image', express.static(path.join(__dirname,'/uploads/images')))


app.use(morgan('dev', {skip: (req: any, res: any) => process.env.NODE_ENV === 'production'}));

app.prefix('/user', (route: any) => {
    userRoute(route)
})

const http = require('http');
const server = http.createServer(app);

process.on('uncaughtException', (error, origin) => {
    console.log('----- Uncaught exception -----')
    console.log(error)
    console.log('----- Exception origin -----')
    console.log(origin)
})

process.on('unhandledRejection', (reason, promise) => {
    console.log('----- Unhandled Rejection at -----')
    console.log(promise)
    console.log('----- Reason -----')
    console.log(reason)
})


const IP = require('ip');
server.listen(config.get("PORT"), () => {
    console.log(`⚡️[NodeJs server]: Server is running at http://${IP.address()}:${config.get("PORT")}`)

    sequelizeClient.authenticate().then(async () => {
        console.log('Connection has been established successfully.')
        // ORM Relation with DB tables
        sequelizeClient.addModels([
            User
        ])
   
        await sequelizeClient.sync()

    }).catch((reason: any) => console.log('[Sequelize Error] ', reason))
    redisClient.on('error', (err: any) => console.log('Redis Client Error', err))

});

export {
    connectedUsers,
}
