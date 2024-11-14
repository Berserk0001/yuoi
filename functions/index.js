const pick = require("../util/pick");
const fetch = require("node-fetch");
const shouldCompress = require("../util/shouldCompress");
const compress = require("../util/compress");

const DEFAULT_QUALITY = 10;

const proxyHandler = async (req, res) => {
    let { url } = req.query;
    let { jpeg, bw, l } = req.query;

    if (!url) {
        return res.status(200).send("bandwidth-hero-proxy");
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
        const { body, headers } = await fetch(url, {
            headers: {
                ...pick(req.headers, ['cookie', 'dnt', 'referer']),
                'user-agent': 'Bandwidth-Hero Compressor',
                'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
                via: '1.1 bandwidth-hero'
            }
        });

        if (!body) {
            return res.status(500).send('Failed to retrieve image.');
        }

        const metadata = await sharp(body).metadata();
        const originSize = parseInt(headers['content-length'], 10) || 0;

        if (shouldCompress(headers['content-type'], originSize, webp)) {
            // Stream the compressed image directly to the response
            await new Promise((resolve, reject) => {
                compress(body, webp, grayscale, quality, originSize, metadata, res);
                res.on('finish', resolve);
                res.on('error', reject);
            });
        } else {
            console.log("Bypassing... Size: ", originSize);
            res.status(200).send(body);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message || "");
    }
};

// Export the proxy handler function
module.exports = proxyHandler;
