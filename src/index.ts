import express, { Request, Response } from 'express'
import ytdl from 'ytdl-core'
import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import timeout from 'connect-timeout'

const app = express()
const port = 3000

app.use(timeout('600s'))

function haltOnTimedOut(req: Request, res: Response, next: any) {
  if (!req.timedout) next()
}

function logger(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
}

app.get(
  '/download',
  async (req: Request, res: Response) => {
    const videoUrl = req.query.url as string

    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
      return res.status(400).send('URL inválida')
    }

    try {
      const info = await ytdl.getInfo(videoUrl)
      const title = info.videoDetails.title
      const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_')
      const videoPath = path.resolve(__dirname, `${sanitizedTitle}_video.mp4`)
      const audioPath = path.resolve(__dirname, `${sanitizedTitle}_audio.mp4`)
      const outputPath = path.resolve(__dirname, `${sanitizedTitle}_final.mp4`)

      logger(`Iniciando o download do vídeo "${title}"`)

      const videoStream = ytdl(videoUrl, {
        filter: format => format.container === 'mp4' && !format.hasAudio,
        quality: 'highestvideo',
      })
      const audioStream = ytdl(videoUrl, {
        filter: 'audioonly',
        quality: 'highestaudio',
      })

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          videoStream
            .pipe(fs.createWriteStream(videoPath))
            .on('finish', () => {
              logger(`Vídeo baixado para ${videoPath}`)
              resolve()
            })
            .on('error', reject)
        }),
        new Promise<void>((resolve, reject) => {
          audioStream
            .pipe(fs.createWriteStream(audioPath))
            .on('finish', () => {
              logger(`Áudio baixado para ${audioPath}`)
              resolve()
            })
            .on('error', reject)
        }),
      ])

      logger('Iniciando a combinação de vídeo e áudio')

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions('-c:v copy')
          .outputOptions('-c:a aac')
          .on('progress', progress => {
            logger(
              `Progresso da combinação: ${Math.round(
                progress.percent,
              )}% concluído`,
            )
          })
          .on('end', () => {
            logger(`Arquivo finalizado: ${outputPath}`)
            resolve()
          })
          .on('error', (err: Error) => {
            console.error(`Erro ao processar o vídeo: ${err.message}`)
            reject(err)
          })
          .save(outputPath)
      })

      res.download(outputPath, err => {
        if (err) {
          console.error(`Erro ao enviar o arquivo: ${err.message}`)
          res.status(500).send('Erro ao enviar o arquivo')
        } else {
          fs.unlinkSync(videoPath)
          fs.unlinkSync(audioPath)
          fs.unlinkSync(outputPath)
          logger(
            `Arquivos temporários removidos: ${videoPath}, ${audioPath}, ${outputPath}`,
          )
        }
      })
    } catch (error: any) {
      console.error(`Erro: ${error.message}`)
      res.status(500).send(`Erro: ${error.message}`)
    }
  },
  haltOnTimedOut,
)

app.listen(port, () => {
  logger(`Servidor rodando em http://localhost:${port}`)
})
