const sharp = require("sharp")

function compress(input, webp, grayscale, quality, originSize, metadata) {
	let format = webp ? 'webp' : 'jpeg'
	let imgWidth = metadata.width
	let imgHeight = metadata.height
	let compressionQuality = quality
	let effortCPU = 2
	let resizeWidth = null
	let resizeHeight = null

	//workaround for webp max res limit by resizing
	if (imgHeight >= 16383) {	//longstrip webtoon/manhwa/manhua
		format = 'webp'
		compressionQuality *= 0.5
		effortCPU = 4
		resizeHeight = 15383
	} else {
		format = 'webp'
		compressionQuality *= 0.5
		effortCPU = 6
	}

	/* experimental avif compression
	if (imgWidth >= 16383 || imgHeight >= 16383) {
	  format = 'jpeg';
	  compressionQuality *= 2.5;
	  effortCPU = 0;
	} else if (imgWidth <= 8704 && imgHeight <= 8704) {
	  format = 'avif';
	  compressionQuality *= 2.0;
	  effortCPU = 2;
	} else if (imgWidth <= 16383 || imgHeight <= 16383) {
	  format = 'webp';
	  compressionQuality *= 0.5;
	  effortCPU = 6;
	}
 	*/
	
        //quality = Math.ceil(compressionQuality)
	
	return sharp(input)
		.resize({
			width: resizeWidth,
			height: resizeHeight
		})
		.grayscale(grayscale)
		.toFormat(format, {
			quality: quality,
			preset: 'picture',
			effort: effortCPU
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
