import fs from 'fs';
import cloudinary from 'cloudinary'

const cloudinaryUpload = async (file) => {
    try {
        const uploaded = await cloudinary.v2.uploader.upload(file, {
            folder: 'user_profile', // save file in this folder
            width: 250,
            height: 250,
            gravity: 'faces',
            crop: 'fill',
        });
        if (uploaded) {
            fs.unlinkSync(file)
        }

        return uploaded
    } catch (error) {
        console.log('Error while uploading image', error);
        if (file) {
            await fs.promises.unlink(file);
        }
    }
}

export default cloudinaryUpload