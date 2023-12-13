import commonUtils from "../../utils/commonUtils";
const jwt = require("jsonwebtoken");
const config = require("config");
import redisClient from "../../utils/redisHelper";

async function verifyToken(req: any, res: any, next: Function) {
   
    let tokens_ = req.headers?.authorization?.split(' ') ?? []
    if(tokens_.length <= 1){
        return commonUtils.sendError(req, res, { message: "Invalid Token"}, 401);
    }
    const token = tokens_[1];
    const decode = jwt.verify(token,config.get("JWT_ACCESS_SECRET"))
    
    const oldValue = await redisClient.get("m_" + decode.userId.toString())

    if(!oldValue){
        return commonUtils.sendError(req, res, { message: "Login First"}, 401);
    }
    jwt.verify(token, config.get("JWT_ACCESS_SECRET"), (err:any, authData:any) => {
        if (err) { 
          res.json({ message: 'Invalidate token' })
        } else {
          req.headers.userid = authData
          next()
        }
      })
}

export default {
    verifyToken,
}