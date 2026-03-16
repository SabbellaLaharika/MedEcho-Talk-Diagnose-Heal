import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
            req.user = decoded;
<<<<<<< HEAD
            return next();
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
=======
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
>>>>>>> 26fb91a424690380f5fc5fcabc7db33ed75eebe6
        }
    }

    if (!token) {
<<<<<<< HEAD
        console.error("No token provided");
        return res.status(401).json({ message: 'Not authorized, no token' });
=======
        res.status(401).json({ message: 'Not authorized, no token' });
>>>>>>> 26fb91a424690380f5fc5fcabc7db33ed75eebe6
    }
};
