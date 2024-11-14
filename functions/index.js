const { request } = require('undici');
const pick = require("../util/pick");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

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
    let quality = parseInt(l, 10) || 10;

    try {
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

        const metadata = await sharp(body).metadata();
        const originSize = parseInt(headers['content-length'], 10) || 0;

        if (shouldCompress(headers['content-type'], originSize, webp)) {
            // Here, we pass the `body` stream to the compress function
            // and pipe the compressed image directly to the response (`res`)
            await new Promise((resolve, reject) => {
                compress(body, webp, grayscale, quality, originSize, metadata, {
                    setHeader: (name, value) => event.headers[name] = value, // Set headers on event if needed
                    write: (data) => { /* Send the data to the response stream */ },
                    end: () => resolve()  // End the response once the image has been fully piped
                });
            });

            return { statusCode: 200 };  // Send the compressed image directly in the stream
        } else {
            console.log("Bypassing... Size: ", originSize);
            return {
                statusCode: 200,
                body: body.toString('base64'),
                isBase64Encoded: true,
                headers: {
                    "content-encoding": "identity",
                    ...headers,
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
