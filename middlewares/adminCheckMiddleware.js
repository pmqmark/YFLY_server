const adminCheckMiddleware = async(req,res,next)=>{
    if(req.user.role !== "admin"){
        return res.status(401).json({msg:"Unauthorized"})
    }else{
        next()
    }
}

module.exports = adminCheckMiddleware;