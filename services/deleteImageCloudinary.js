import cloudinary from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const deleteImageCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (result, error) => {
      if (error) {
        console.error('Cloudinary error object:', error); // Log full error object
        const errorMessage = error || 'Unknown error';
        reject(new Error(`Failed to delete image: `, error));
      } else {
        console.log('Cloudinary result object:', result); // Log full result object
        if (result.result === 'ok') {
          resolve(result); // Successfully deleted
        } else {
          // Handle unexpected results
          reject(
            new Error(
              `Failed to delete image: Unexpected result ${JSON.stringify(result)}`
            )
          );
        }
      }
    });
  });
};
