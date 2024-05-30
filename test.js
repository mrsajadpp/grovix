const webp = require('webp-converter');
const fs = require('fs');
const path = require('path');

// Function to convert JPG to WebP
async function convertJpgToWebp(inputPath, outputPath) {
    try {
        // Ensure the output directory exists
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        // Convert the image
        const result = await webp.cwebp(inputPath, outputPath, "-q 80"); // Adjust the quality as needed

        if (result === '100') {
            console.log(`Converted ${inputPath} to ${outputPath}`);
        } else {
            console.error('Error converting image:', result);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example usage
const inputImagePath = './public/img/banner.jpg';
const outputImagePath = './public/img/banner.webp';

convertJpgToWebp(inputImagePath, outputImagePath);
