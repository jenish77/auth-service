import UserController from "./userController";
import V from "./validation";
export default [
    {
        path: "/register",
        method: "post",
        isPublic: true,
        validation: V.userRegisterValidation,
        controller: UserController.register,
    },
    {
        path: "/login",
        method: "post",
        isPublic: true,
        validation: V.loginValidation,
        controller: UserController.login,
    },
    {
        path: "/logout",
        method: "patch",
        // isPublic: true,
        controller: UserController.logout,
    },
    {
        path: "/verify-user",
        method: "post",
        isPublic: true,
        validation: V.verifyUserValidation,
        controller: UserController.verifyUser,
    },
    {
        path: "/get-profile",
        method: "get",
        // isPublic: true,
        controller: UserController.getProfile,
    },
    {
        path: "/refreshToken",
        method: "get",
        controller: UserController.getAccessToken,
        isPublic: true,
    },
]

