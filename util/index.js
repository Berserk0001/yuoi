
const undici = require('undici');
const pick = require("./pick.js");
const shouldCompress = require("./shouldCompress.js");
const compress = require("./compress.js");
const sharp = require("sharp");

const DEFAULT_QUALITY = 10;

async function proxy(req, res) {
    let { url, jpeg, bw, l } = req.query;

    if (!url) {
        res.status(200).send("bandwidth-hero-proxy");
        return;
    }

    try {
        url = JSON.parse(url);  
    } catch { }

    if (Array.isArray(url)) {
        url = url.join("&url=");
    }

    url = url.replace(/http:\/\/1\.1\.\d\.\d\/bmi\/(https?:\/\/)?/i, "http://");

    const webp = !jpeg;  
    const grayscale = bw != 0;  
    const quality = parseInt(l, 10) || DEFAULT_QUALITY;  

    try {
        const { body, headers } = await undici.request(url, {
            headers: {
                ...pick(req.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': 'Bandwidth-Hero Compressor',
                'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
                via: '1.1 bandwidth-hero'
            }
        });

        if (!body) {
            res.status(500).send('Failed to retrieve image.');
            return;
        }

        const metadata = await sharp(body).metadata();    
        const originSize = parseInt(headers['content-length'], 10) || 0;

        if (shouldCompress(headers['content-type'], originSize, webp)) {
            let { err, output, headers: compressionHeaders } = await compress(body, webp, grayscale, quality, originSize, metadata);

            if (err) {
                console.log("Conversion failed: ", url);
                res.status(500).send("Conversion failed");
                return;
            }

            console.log(`From: ${originSize}, To: ${output.length}, Saved: ${(originSize - output.length)}`);
            res.writeHead(200, {
                "content-encoding": "identity",
                ...headers,
                ...compressionHeaders
            });
            res.end(output);
        } else {
            console.log("Bypassing... Size: ", originSize);
            res.writeHead(200, {
                "content-encoding": "identity",
                ...headers,
            });
            body.pipe(res);  // Stream the original image directly to the response if bypassing compression
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "An error occurred");
    }
}

module.exports = proxy;
