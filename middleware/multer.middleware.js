import multer from 'multer';
import path from 'path';


const upload = multer({
    dest: 'uploads/',  // files will be stored here
    limits: { fileSize: 50 * 1024 * 1024 }, // : Sets a limit of 50 MB for the file size.
    storage: multer.diskStorage({  //Configures file storage settings using disk storage.
        destination: 'uploads/',  //  Specifies the destination folder for storing files on disk.
        filename: (_req, file, cb) => {
            cb(null, file.originalname);
        }
    }),
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname);

        if (
            ext !== '.jpg' &&
      ext !== '.jpeg' &&
      ext !== '.webp' &&
      ext !== '.png' &&
      ext !== '.mp4'
        ) {
            cb(new Error(`Unsupported file type! ${ext}`), false);
            return;
        }

        cb(null, true);
    }
});

export default upload;
