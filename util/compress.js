const sharp = require("sharp");

function compress(input, webp, grayscale, quality, originSize, metadata, res) {
    let format = webp ? 'webp' : 'jpeg';
    let imgWidth = metadata.width;
    let imgHeight = metadata.height;
    let compressionQuality = quality;
    let effortCPU = 6;
    let resizeWidth = null;
    let resizeHeight = null;

    // workaround for webp max res limit by resizing
    if (imgHeight >= 16383) {  // longstrip webtoon/manhwa/manhua
        format = 'webp';
        compressionQuality *= 0.5;
        effortCPU = 6;
        resizeHeight = 16383;
    } else {
        format = 'webp';
        compressionQuality *= 0.5;
        effortCPU = 6;
    }

    // Create a new sharp instance to process the input stream
    const transform = sharp()
        .resize({
            width: resizeWidth,
            height: resizeHeight
        })
        .grayscale(grayscale)
        .toFormat(format, {
            quality: compressionQuality,
            preset: 'picture',
            effort: effortCPU
        });

    // Pipe the input stream through sharp and then to the response stream
    input
        .pipe(transform)  // Pipe the image input stream to sharp
        .on('info', (info) => {
            // Attach custom headers to the response after processing the image
            res.setHeader("content-type", `image/${format}`);
            res.setHeader("content-length", info.size);
            res.setHeader("x-original-size", originSize);
            res.setHeader("x-bytes-saved", originSize - info.size);
        })
        .pipe(res)  // Pipe the output directly to the response
        .on('finish', () => {
            console.log("Image compressed and sent to response.");
        })
        .on('error', (err) => {
            console.error("Compression error:", err);
            res.statusCode = 500;
            res.end('Error compressing image');
        });
}

module.exports = compress;
