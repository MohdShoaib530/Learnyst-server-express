import cloudinary, { v2 } from 'cloudinary';
import fs from 'fs';

import envVar from '../configs/config.js';

// Cloudinary configuration
v2.config({
  cloud_name: envVar.cloudinaryCloudName,
  api_key: envVar.cloudinaryApiKey,
  api_secret: envVar.cloudinaryApiSecret
});

const cloudinaryUpload = async (file) => {
  console.log('file', file);
  try {
    if (file.fieldname === 'avatar') {
      const uploaded = await cloudinary.v2.uploader.upload(file.path, {
        folder: `${file.fieldname}`, // save file in this folder
        width: 250,
        height: 250,
        gravity: 'faces',
        crop: 'fill'
      });
      if (uploaded) {
        fs.unlinkSync(file.path);
      }

      return uploaded;
    } else if (file.fieldname === 'coverImage') {
      const uploaded = await cloudinary.v2.uploader.upload(file.path, {
        folder: `${file.fieldname}` // save file in this folder
      });
      if (uploaded) {
        fs.unlinkSync(file.path);
      }

      return uploaded;
    } else if (file.fieldname === 'lecture') {
      const uploaded = await cloudinary.v2.uploader.upload(file.path, {
        folder: `${file.fieldname}`,
        chunk_size: 50000000, // 50 mb size
        resource_type: 'video'
      });
      if (uploaded) {
        fs.unlinkSync(file.path);
      }

      return uploaded;
    } else if (file.fieldname === 'thumbnail') {
      const uploaded = await cloudinary.v2.uploader.upload(file.path, {
        folder: `${file.fieldname}`,
        chunk_size: 50000000, // 50 mb size
        resource_type: 'auto'
      });
      if (uploaded) {
        fs.unlinkSync(file.path);
      }

      return uploaded;
    }
  } catch (error) {
    console.log('Error while uploading image', error);
    if (file) {
      await fs.promises.unlink(file.path);
    }
  }
};

export default cloudinaryUpload;
