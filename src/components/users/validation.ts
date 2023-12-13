import {NextFunction, Request, Response} from "express"
import validator from "../../utils/validate";

const userRegisterValidation = async (req:Request,res:Response,next:NextFunction) => {
    const { username, mobile, email } = req.body; 

    if (!( username || mobile || email)) {
        return res.status(400).json({ error: "At least one of this field username, mobile, email, unique_id is required." });
    }
    const ValidationRule = {
        // "unique_id": "string|required_without_all:username,mobile,email",
        "username": "required_without_all:mobile,email|no_whitespace|min:3|max:20|regex:/^(?!.*[_-]{2,})[a-zA-Z0-9_-]*$/",
        "mobile": "required_without_all:username,email|regex:/^[0-9]{10}$/",
        "email": "required_without_all:username,mobile|email|unique:User,email",
        "password": 'required|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*_])[A-Za-z\\d!@#$%^&*_]+$/',
    };
    validator.validatorUtilWithCallback(ValidationRule, {
        'regex.password':"Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character.",
        'no_whitespace': "Username cannot contain blank spaces.",
        'regex.username': "Username should consist of letters and numbers only, and should not contain consecutive underscores or hyphens."
    }, req, res, next);
};

async function loginValidation(req: Request, res: Response, next: NextFunction) {
    const {  username, mobile, email } = req.body; 

    if (!( username || mobile || email)) {
        return res.status(400).json({ error: "At least one of this field username, mobile, email is required." });
    }
    let validationRule: any;

    validationRule = {
        // "unique_id": "string|required_without_all:username,mobile,email",
        "username": "required_without_all:mobile,email",
        "mobile": "required_without_all:username,email|regex:/^[0-9]{10}$/",
        "email": "required_without_all:username,mobile|email|unique:User,email",
        "password": 'required',
    }

    validator.validatorUtilWithCallback(validationRule, {}, req, res, next);
}

async function verifyUserValidation(req: Request, res: Response, next: NextFunction) {
    let validationRule: any;

    validationRule = {
        "otp": 'required',
    }

    validator.validatorUtilWithCallback(validationRule, {}, req, res, next);
}

 export default {
    userRegisterValidation,
    loginValidation,
    verifyUserValidation
}