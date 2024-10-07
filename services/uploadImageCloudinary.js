import cloudinary from 'cloudinary';

export const uploadImageCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'Posts'
    });
    return result;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};
