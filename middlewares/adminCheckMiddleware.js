const adminCheckMiddleware = async(req,res,next)=>{
    if(req?.user?.role === "admin"){
        next()
    }else{
        return res.status(401).json({msg:"Unauthorized"})
    }
}

module.exports = adminCheckMiddleware;