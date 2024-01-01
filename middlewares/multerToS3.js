const multer = require('multer');
const multerS3 = require('multer-s3');
const {S3Client} = require('@aws-sdk/client-s3');
const Application = require('../models/ApplicationModel');

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION;
const Bucket = process.env.S3_BUCKET;

const s3Client = new S3Client({
    region: region,
    credentials:{
        accessKeyId:accessKeyId,
        secretAccessKey:secretAccessKey
    }
})

// Upload files to AWS S3 Bucket;

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket:Bucket,
        key:(req,file,cb)=>{
            const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9)
            cb(null, `${uniquePrefix}-${file.originalname}`);
        },
    }),
    // fileFilter: async(req,file,cb)=>{
    //     const applicationId = req.params.id;
    //     console.log("appId in multer",applicationId)
    //     console.log("req.body in multer", req.body)
    //     console.log("req.url in multer", req.url.split("/")[1])
    //     const {docName} = req.body;
    //     console.log("docname in multer", docName)
    //     const exists = await Application.findOne({_id:applicationId, 'documents':{$elemMatch:{name:docName}}})
    //     if(exists && req.url.split("/")[1] === "upload-documents"){
    //         cb(null,false)
    //     }else{
    //         cb(null,true)
    //     }
    // }
});

module.exports = upload;