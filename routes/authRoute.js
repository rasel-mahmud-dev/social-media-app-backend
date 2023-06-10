import {
    createNewUser,
    login,
    loginWithGoogle,
    updateProfile,
    verifyAuth
} from "../controllers/authController";
import {auth} from "../middlewares";
import  {authUrl} from "../services/googeAuth";



const router = require("express").Router();

router.post("/registration", createNewUser);
router.post("/login", login);
router.get("/fetch-auth", verifyAuth);
router.post("/update-profile", auth, updateProfile);


// Redirect users to the authentication URL
router.get('/google', (req, res) => {
    res.redirect(authUrl);
});

// Handle the callback from Google after authentication
router.get('/callback/google', loginWithGoogle);


export default router