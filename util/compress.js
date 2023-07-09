const sharp = require("sharp");

function compress(input, webp, grayscale, quality, originSize) {
	const format = webp ? "webp" : "jpg";
	let compressionQuality = quality * 0.5;
            
        quality = Math.ceil(compressionQuality)
	
	return sharp(input)
		.grayscale(grayscale)
		.toFormat(format, {
			quality: quality,
			progressive: true,
			mozjpeg: true,
			effort: 6
		})
		.toBuffer({resolveWithObject: true})
		.then(({data: output, info}) => {	// this way we can also get the info about output image, like height, width
		// .toBuffer()
		// .then( output => {
			return {
				err: null,
				headers: {
					"content-type": `image/${format}`,
					"content-length": info.size,
					"x-original-size": originSize,
					"x-bytes-saved": originSize - info.size,
				},
				output: output
			};
		}).catch(err => {
			return {
				err: err
			};
		});
}

module.exports = compress;
