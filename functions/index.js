const { request } = require('undici');
const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");
const sharp = require("sharp");

const DEFAULT_QUALITY = 10;

exports.handler = async (event, context) => {
    let { url } = event.queryStringParameters;
    let { jpeg, bw, l } = event.queryStringParameters;

    if (!url) {
        return {
            statusCode: 200,
            body: "bandwidth-hero-proxy"
        };
    }

    try {
        url = JSON.parse(url);  
    } catch { }

    if (Array.isArray(url)) {
        url = url.join("&url=");
    }

    url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

    let webp = !jpeg;  
    let grayscale = bw != 0;  
    let quality = parseInt(l, 10) || DEFAULT_QUALITY;  

    try {
        let response_headers = {};
        const { body, headers } = await request(url, {
            headers: {
                ...pick(event.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': 'Bandwidth-Hero Compressor',
                'x-forwarded-for': event.headers['x-forwarded-for'] || event.ip,
                via: '1.1 bandwidth-hero'
            }
        });

        if (!body) {
            return {
                statusCode: 500,
                body: 'Failed to retrieve image.'
            };
        }

        response_headers = headers;
        const metadata = await sharp(body).metadata();    

        const originSize = parseInt(headers['content-length'], 10) || 0;

        if (shouldCompress(headers['content-type'], originSize, webp)) {
            let { err, output, headers } = await compress(body, webp, grayscale, quality, originSize, metadata);

            if (err) {
                console.log("Conversion failed: ", url);
                throw err;
            }

            console.log(`From: ${originSize}, To: ${output.length}, Saved: ${(originSize - output.length)}`);
            const encoded_output = output.toString('base64');
            return {
                statusCode: 200,
                body: encoded_output,
                isBase64Encoded: true,
                headers: {
                    "content-encoding": "identity",
                    ...response_headers,
                    ...headers
                }
            };
        } else {
            console.log("Bypassing... Size: ", originSize);
            return {
                statusCode: 200,
                body: body.toString('base64'),
                isBase64Encoded: true,
                headers: {
                    "content-encoding": "identity",
                    ...response_headers,
                }
            };
        }
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: err.message || ""
        };
    }
};
