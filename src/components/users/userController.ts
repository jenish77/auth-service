import { NextFunction, Request, Response } from "express";
const jwt = require('jsonwebtoken');
const config = require("config");
import { SequelizeDbHelper } from "../../../sequlizeDB"
let sequelizeDbHelper = SequelizeDbHelper.getInstance()
let sequelizeClient = sequelizeDbHelper.getSequelizeClint()
import commonUtils from "../../utils/commonUtils";
import { User } from './models/userModel';
import redisClient from "../../utils/redisHelper";
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const header = { alg: 'HS256', typ: 'JWT' };

async function register(req: Request, res: Response) {
    try {
    
        const whereConditions = [];

        if (req.body.email != undefined && req.body.email !== '') {
            whereConditions.push({ email: req.body.email });
        }

        if (req.body.mobile != undefined && req.body.mobile !== '') {
            whereConditions.push({ mobile: req.body.mobile });
        }

        if (req.body.username != undefined && req.body.username !== '') {
            whereConditions.push({ username: req.body.username });
        }

        // if (req.body.unique_id != undefined && req.body.unique_id !== '') {
        //     whereConditions.push({ unique_id: req.body.unique_id });
        // }

        const old_user = await User.findOne({
            raw: true,
            where: {
                [Op.or]: whereConditions.length > 0 ? whereConditions : [{ id: null }] // Dummy condition to prevent an empty OR array
            }
        });
        
        if(old_user){
            return commonUtils.sendError(req, res, { "errors":"User already exist" });
        }
       
        let OTP = Math.floor(1000 + Math.random() * 9000);
        
        const payload = { ...req.body,OTP };
        const payloadString = JSON.stringify(payload);

        const token_data =  { [payloadString] : new Date().toISOString()  }
        
        const token = jwt.sign({userId:token_data}, config.get("JWT_ACCESS_SECRET"), {expiresIn: config.get("JWT_ACCESS_TIME")});

        await redisClient.set("auth_token",token, (err: any, reply: any) => {
            if (err) {
                console.error(err);
            } else {
                console.log('Token stored in Redis:', reply);
            }
        })

        if(req.body.email){
            EmailSend(req.body.email, 'Auth Service User Verification', OTP)
        }
        return commonUtils.sendSuccess(req, res, {verify_token:token, otp:OTP});
    }
    catch (error) {
        return commonUtils.sendError(req, res, { "message":"Something Went Wrong" });
    }
}

async function verifyUser(req: Request, res: Response) {
    try {
        let token = req.body.token;
        const otp = req.body.otp;
        var decoded = jwt.verify(token,  config.get("JWT_ACCESS_SECRET"));
        const decodedPayload:any = JSON.parse(Object.keys(decoded.userId)[0]);
        const tokenTimestamp = new Date(decoded[Object.keys(decoded.userId)[0]]).getTime();

        const currentTimestamp = new Date().getTime();
        const timeDifference = currentTimestamp - tokenTimestamp;
        const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds
        const salt = await bcrypt.genSalt(10);

        if (timeDifference > fiveMinutesInMs) {
            return commonUtils.sendError(req, res, { "message": "Timeout please register again." });
        } else {
            if (decodedPayload.OTP == otp ) {
                const user = new User({
                    username: decodedPayload.username ?? null,
                    mobile: decodedPayload.mobile ?? null,
                    email: decodedPayload.email ?? null,
                    // unique_id: decodedPayload.unique_id ?? null,
                    password : await bcrypt.hash(decodedPayload.password, salt),
                });
                await user.save();
                
                delete decodedPayload.OTP;
                
                return commonUtils.sendSuccess(req, res, {message:"User verify successfully",data:decodedPayload.data});
            } else {
                return commonUtils.sendError(req, res, { "message":"Invalid Otp" });
            }  
        }
        
    } catch (error) {
        return commonUtils.sendError(req, res, { "message":"Something Went Wrong" });
    }
}

async function login(req: Request, res: Response) {
    try {
        const password = req.body.password;

        const whereConditions = [];

        if (req.body.email != undefined && req.body.email !== '') {
            whereConditions.push({ email: req.body.email });
        }

        if (req.body.mobile != undefined && req.body.mobile !== '') {
            whereConditions.push({ mobile: req.body.mobile });
        }

        if (req.body.username != undefined && req.body.username !== '') {
            whereConditions.push({ username: req.body.username });
        }

        // if (req.body.unique_id != undefined && req.body.unique_id !== '') {
        //     whereConditions.push({ unique_id: req.body.unique_id });
        // }

        const userData = await User.findOne({
            raw: true,
            where: {
                [Op.or]: whereConditions.length > 0 ? whereConditions : [{ id: null }] // Dummy condition to prevent an empty OR array
            }
        });

        if (!userData){
            return commonUtils.sendError(req, res, { "message":"User does not exist" });
        }

        let result = bcrypt.compareSync(password, userData.password)

        if (!result) {
            return commonUtils.sendError(req, res, { "message":"Invalid Credential" });
        }
        const access_token = jwt.sign({userId:userData.id}, config.get("JWT_ACCESS_SECRET"), {expiresIn: config.get("JWT_ACCESS_TIME")});
        const refresh_token = jwt.sign({userId:userData.id}, config.get("JWT_REFRESH_SECRET"), {expiresIn: config.get("JWT_REFRESH_TIME")});

        await redisClient.lpush('BL_' + userData.id.toString(), access_token);

        let data = {accessToken: access_token, refreshToken: refresh_token, loginTime: new Date().toUTCString(), oldValue : false} 

        await redisClient.set("m_" + userData.id.toString(), JSON.stringify(data))

        res.cookie("accessToken", access_token, { maxAge: 900000, httpOnly: true });
        res.cookie("refreshToken", refresh_token, { maxAge: 900000, httpOnly: true });

        return commonUtils.sendSuccess(req, res, {access_token,refresh_token});
        }
        
     catch (error) {
        return commonUtils.sendError(req, res, { "message":"Something Went Wrong" });
    }
}

async function logout(req: Request, res: Response) {
    try {
        const tokens_ = req.headers?.authorization?.split(' ') ?? []

        if (tokens_.length <= 1) {
            return commonUtils.sendError(req, res, {message: "Invalid Token"}, 403);
        }
        const token = tokens_[1];
        const decode = jwt.verify(token, config.get("JWT_ACCESS_SECRET"))
        const oldValue = await redisClient.get("m_" + decode.userId.toString())

        if (oldValue) {
            let exists = JSON.parse(oldValue).accessToken === token
            if (exists) await redisClient.lpush('BL_' + decode.userId.toString(), JSON.parse(oldValue).accessToken);

            await redisClient.del("m_" + decode.userId.toString())
        }

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        return commonUtils.sendSuccess(req, res, {message:"Logout Successfully."});

    } catch (error) {
        return commonUtils.sendError(req, res, { "message":"Something Went Wrong" });
    }
}

async function getProfile(req: Request, res: Response){
    try {
        const user_Id:any = req.headers.userid
       
        const profile = await User.findOne({ where:{ id:user_Id.userId }})
        return commonUtils.sendSuccess(req, res, {profile} );
    } catch (error) {
        return commonUtils.sendError(req, res, { "message":"Something Went Wrong" });
    }
}
async function EmailSend(email: any, subject: any, otp: any) {
    try {
        let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, 
            pool: false,
            auth: {
                user: config.get("EMAIL"),
                pass: config.get("PASSWORD")
            }
        });

        let mailOptions = {
            from: '"Elaunch Auth Service"',
            to: email,
            subject: subject,
            html: `<div style="padding: 20px; margin: 20px; background-color: #f5f5f5;">
            <h3 style="margin-bottom: 20px;">Verification</h3>
            <p>You are receiving this email because we have received a verification request from the Team.</p>
            <p>Please enter the below code to verify.</p>
            <p style="font-size: 15px; font-weight: bold;">Your One Time Password (OTP) is: ${otp}</p>
            <p>If you have not make a request, kindly ignore this email and do not share your OTP/Password with anyone.</p>
            <p>Regards,<br>Team</p>
          </div>`
        };

        transporter.sendMail(mailOptions, function (error: any, info: any) {
            if (error) {
                console.log('mail send error ==== ', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    catch (error) {
        console.log("ERROR",error);
    }
}

const getAccessToken = async (req: any, res: Response) => {
    const tokens_ = req.headers?.authorization?.split(' ') ?? []

    if (tokens_.length <= 1) {
        return commonUtils.sendError(req, res, { message: 'INVALID_TOKEN' }, 401);
    }
    const oldToken = tokens_[1];

    getAccessTokenPromise(oldToken).then((result: any) => {      
        
        const { refreshToken, accessToken } = result
        res.cookie("accessToken", accessToken, { maxAge: 900000, httpOnly: true });
        res.cookie("refreshToken", refreshToken, { maxAge: 900000, httpOnly: true });
        const decode = jwt.verify(accessToken, config.get("JWT_ACCESS_SECRET"))
        
        return commonUtils.sendSuccess(req, res, {'data':accessToken});
    }).catch((err: any) => {
        return commonUtils.sendError(req, res, { message: err?.error }, err.status)
    })
}

const getAccessTokenPromise = async (oldToken: any) => {
    
    return new Promise((resolve, reject) => {
   
        jwt.verify(oldToken, config.get("JWT_REFRESH_SECRET"), async (err: any, user: any) => {
            if (err) {               
                return reject({ status: 401 });
            } else {

                const accessToken = jwt.sign({userId:user.userId}, config.get("JWT_ACCESS_SECRET"), { expiresIn: config.get("JWT_ACCESS_TIME") });
                
                const refreshToken = await generateRefreshToken(user.userId);

                let data = { accessToken: accessToken, refreshToken: refreshToken, loginTime: new Date().toUTCString(),oldValue:false }

                const oldValue = await redisClient.get("m_" + user.userId.toString())
            
                if (oldValue) {
                    data.oldValue = true;
                    await redisClient.lpush('BL_' + user.userId.toString(), JSON.parse(oldValue).accessToken);
                }

                await redisClient.set("m_" + user.userId.toString(), JSON.stringify(data))

                return resolve(data)
            }
        })
    })
}

const generateRefreshToken = async (payload: Number) => {
    return jwt.sign({userId:payload}, config.get("JWT_REFRESH_SECRET"), {expiresIn: config.get("JWT_REFRESH_TIME")});
}

export default {
    register,
    verifyUser,
    login,
    logout,
    getProfile,
    EmailSend,
    getAccessToken,
    generateRefreshToken
}