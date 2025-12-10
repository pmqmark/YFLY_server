const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// DigitalOcean Spaces credentials and settings come from env
const accessKeyId = process.env.DO_SPACES_KEY;
const secretAccessKey = process.env.DO_SPACES_SECRET;
const endpoint = process.env.DO_SPACES_ENDPOINT; // e.g. https://yfly.blr1.digitaloceanspaces.com
const Bucket = process.env.DO_SPACES_BUCKET;

// Derive a reasonable region from the endpoint hostname if possible
let region = process.env.S3_REGION || "us-east-1";
try {
  if (endpoint) {
    const host = new URL(endpoint).host; // e.g. yfly.blr1.digitaloceanspaces.com
    const parts = host.split(".");
    // typical DO host: <bucket>.<region>.digitaloceanspaces.com
    if (parts.length >= 3) region = parts[1];
  }
} catch (e) {
  // fallback to default region
}

const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// allowed file types and size: mirror the local middleware behavior
const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else
    cb(
      new Error("Only images (JPEG, PNG, GIF, WEBP) and PDFs are allowed"),
      false
    );
};

const uploadDO = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: Bucket,
    acl: "public-read",
    key: (req, file, cb) => {
      const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `Documents/${uniquePrefix}-${file.originalname}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = uploadDO;
