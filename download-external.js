#!/usr/bin/env node
const HTTPS = require("https");
const FS = require("fs");
const Crypto = require("crypto");

process.on("unhandledRejection", error => {
	throw error;
});

function getMD5Hash(string) {
	return Crypto.createHash("md5").update(string).digest("hex");
}

async function download(url, to) {
	return new Promise((resolve, reject) => {
		const file = FS.createWriteStream(to);
		const request = HTTPS.get(url, response => {
			response.pipe(file);
		});
		file.on("finish", () => {
			file.close(resolve);
		});
		request.on("error", error => {
			FS.unlink(to);
			reject(error);
		});
	});
}

const wikiFilePrefix = "https://wiki.teamfortress.com/w/images/";
async function downloadWikiImage(name, to) {
	const [first, second] = getMD5Hash(name);
	return download(
		wikiFilePrefix + first + "/" + first + second + "/" + name,
		to
	);
}

const before = Date.now();
Promise.all(
	[
		["Item_icon_Medi_Gun.png", "medigun.png"],
		["Item_icon_Kritzkrieg.png", "kritzkrieg.png"],
		["Item_icon_Quick-Fix.png", "quickfix.png"],
		["Item_icon_Vaccinator.png", "vaccinator.png"],
		["Item_icon_Ubersaw.png", "ubersaw.png"],
		["Health_dead.png", "dead.png"]
	]
	.map(([wikiName, name]) => {
		return downloadWikiImage(wikiName, "./external/tf2/images/" + name);
	})
).then(() => {
	console.log("Done in ~" + Math.round((Date.now() - before) / 100) / 10 + " seconds");
})
