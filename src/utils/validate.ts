const Validator = require('validatorjs');
import commonUtils from "./commonUtils";
import express, {NextFunction, Request, Response} from "express";
import { User } from "../components/users/models/userModel";
const Sequelize = require('sequelize');
const { Op } = Sequelize;


const validatorUtilWithCallback = (rules: any, customMessages: any, req: Request, res: Response, next: NextFunction) => {
    const validation = new Validator(req.body, rules, customMessages);
    validation.setAttributeNames(customMessages);
    
    validation.passes(() => next());
    validation.fails(() => commonUtils.sendError(req, res, {
        errors: commonUtils.formattedErrors(validation.errors.errors)
    }));
};


Validator.registerAsync('unique', function (value: any, attribute: any, req: Request, passes: any) {
    if (!attribute) throw new Error('Specify Requirements i.e fieldName: exist:table,column');
 
    let attArr = attribute.split(",")
   
    const { 0: table, 1: column, 2: id  } = attArr;

    let msg = (column == "email") ? `${column} has already been taken ` : `${column} already in use`

   User.findOne({where: { [column]: value,  id: { [Op.ne]: id } }}).then((result: any) => {
    
        if (result) {
            passes(false, msg);
        } else {
            passes();
        }
    }).catch((err: any) => {
        passes(false, err);
    });
 
 })



 // Register an asynchronous custom validator for 'no_whitespace'
 Validator.registerAsync('no_whitespace', (value: any, attribute: any, req: Request, passes: any) => {
    let msg =  `username cannot contain blank spaces`

   return new Promise((resolve, reject) => {
     if (/\s/.test(value)) { // Check for whitespace using regex
        passes(false, msg);
     } else {
        passes();
    }
   });
 });
 


export default {
    validatorUtilWithCallback
}