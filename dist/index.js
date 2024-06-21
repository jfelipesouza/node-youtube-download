"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_express = __toESM(require("express"));
var import_ytdl_core = __toESM(require("ytdl-core"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_fluent_ffmpeg = __toESM(require("fluent-ffmpeg"));
var app = (0, import_express.default)();
var port = 3e3;
app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !import_ytdl_core.default.validateURL(videoUrl)) {
    return res.status(400).send("URL inv\xE1lida");
  }
  try {
    const info = await import_ytdl_core.default.getInfo(videoUrl);
    const title = info.videoDetails.title;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, "_");
    const videoPath = import_path.default.resolve(__dirname, `${sanitizedTitle}_video.mp4`);
    const audioPath = import_path.default.resolve(__dirname, `${sanitizedTitle}_audio.mp4`);
    const outputPath = import_path.default.resolve(__dirname, `${sanitizedTitle}.mp4`);
    const videoStream = (0, import_ytdl_core.default)(videoUrl, {
      filter: (format) => format.container === "mp4" && !format.hasAudio,
      quality: "highestvideo"
    });
    const audioStream = (0, import_ytdl_core.default)(videoUrl, {
      filter: "audioonly",
      quality: "highestaudio"
    });
    await Promise.all([
      new Promise((resolve, reject) => {
        videoStream.pipe(import_fs.default.createWriteStream(videoPath)).on("finish", resolve).on("error", reject);
      }),
      new Promise((resolve, reject) => {
        audioStream.pipe(import_fs.default.createWriteStream(audioPath)).on("finish", resolve).on("error", reject);
      })
    ]);
    (0, import_fluent_ffmpeg.default)().input(videoPath).input(audioPath).outputOptions("-c:v copy").outputOptions("-c:a aac").save(outputPath).on("end", () => {
      res.download(outputPath, (err) => {
        if (err) {
          console.error(`Erro ao enviar o arquivo: ${err.message}`);
          res.status(500).send("Erro ao enviar o arquivo");
        } else {
          import_fs.default.unlinkSync(videoPath);
          import_fs.default.unlinkSync(audioPath);
          import_fs.default.unlinkSync(outputPath);
        }
      });
    }).on("error", (err) => {
      console.error(`Erro ao processar o v\xEDdeo: ${err.message}`);
      res.status(500).send("Erro ao processar o v\xEDdeo");
    });
  } catch (error) {
    console.error(`Erro: ${error.message}`);
    res.status(500).send(`Erro: ${error.message}`);
  }
});
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
