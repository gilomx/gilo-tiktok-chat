import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import { getReaderConfig } from "./readerConfigService.js";
import { getGoogleCredentialsPath } from "./googleCredentialsService.js";

let client = null;
let clientKeyPath = "";

function getClient() {
  const credentialsPath = getGoogleCredentialsPath();
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    return null;
  }

  if (!client || clientKeyPath !== credentialsPath) {
    client = new textToSpeech.TextToSpeechClient({
      keyFilename: credentialsPath
    });
    clientKeyPath = credentialsPath;
  }

  return client;
}

export async function synthesizeSpeech(text) {
  const ttsClient = getClient();
  const readerConfig = await getReaderConfig();

  if (!ttsClient) {
    const error = new Error("Google TTS no esta configurado. Revisa GOOGLE_APPLICATION_CREDENTIALS.");
    error.statusCode = 503;
    throw error;
  }

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text },
    voice: {
      languageCode: readerConfig.languageCode,
      name: readerConfig.voiceName
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: readerConfig.speakingRate,
      pitch: readerConfig.pitch,
      volumeGainDb: readerConfig.volumeGainDb
    }
  });

  return response.audioContent;
}
