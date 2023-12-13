import express, {NextFunction, Request, Response} from "express";
import verifyToken from "../middleware/validation/index";


async function sendSuccess(req: Request, res: Response, data: any, statusCode = 200) {
    if (req.headers.env === "test") {
        return res.status(statusCode).send(data)
    }

    // let encData = await encryptedData.EncryptedData(req, res, data)
    return res.status(statusCode).send(data)
}

async function sendError(req: Request, res: Response, data: any, statusCode = 422) {
    if (req.headers.env === "test") {
        return res.status(statusCode).send(data)
    }

    // let encData = await encryptedData.EncryptedData(req, res, data)
    return res.status(statusCode).send(data)
}

const routeArray = (array_: any, prefix: any, isAdmin: Boolean = false) => {
    // path: "", method: "post", controller: "",validation: ""(can be array of validation), 
    // isEncrypt: boolean (default true), isPublic: boolean (default false)

    array_.forEach((route: any) => {
        const method = route.method as "get" | "post" | "put" | "delete" | "patch";
        const path = route.path;
        const controller = route.controller;
        const validation = route.validation;
        let middlewares = [];
        const isEncrypt = route.isEncrypt === undefined ? true : route.isEncrypt;
        const isPublic = route.isPublic === undefined ? false : route.isPublic;
        const skipComponentId = route.skipComponentId === undefined ? false : route.skipComponentId;
        const isGuest = route.isGuest === undefined ? false : route.isGuest;
        // if (isEncrypt && !isAdmin) {
        //     middlewares.push(decryptedData.DecryptedData);
        // }

        if (!isPublic) {
            middlewares.push(verifyToken.verifyToken);
        }

        // if (isGuest) {
        //     guestRoute.push(path)
        // }
        // middlewares.push(verifyToken.verifyGuestPath);

        // if (isAdmin) {
        //     middlewares.push(verifyToken.isAdmin);
        // }
      
        if (validation) {
            if (Array.isArray(validation)) {
                middlewares.push(...validation);
            } else {
                middlewares.push(validation);
            }
        }
        middlewares.push(controller);
        prefix[method](path, ...middlewares);
    })

    return prefix;
}
function formattedErrors(err: any) {
    let transformed: any = {};
    Object.keys(err).forEach(function (key, val) {
        transformed[key] = err[key][0];
    })
    return transformed
}

export default {
    routeArray,
    sendSuccess,
    sendError,
    formattedErrors
}