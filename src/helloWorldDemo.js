import { HostObject } from "@amazon-sumerian-hosts/babylon";
import { Scene } from "@babylonjs/core/scene";
import DemoUtils from "./demo-utils";
import { cognitoIdentityPoolId } from "./demo-credentials.js";
import { Amplify, API } from "aws-amplify";
import awsConfig from "./aws-exports";
//import { text } from "stream/consumers";
import {v4 as uuidv4} from 'uuid';


let host;
let scene;
let submitButton;
let chatHistory = ''
Amplify.configure(awsConfig);

async function createScene() {
  // Create an empty scene. Note: Sumerian Hosts work with both
  // right-hand or left-hand coordinate system for babylon scene
  scene = new Scene();

   DemoUtils.setupSceneEnvironment(scene);

  initUi(uuidv4());

  // ===== Configure the AWS SDK =====

  AWS.config.region = cognitoIdentityPoolId.split(":")[0];
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: cognitoIdentityPoolId,
  });

  // ===== Instantiate the Sumerian Host =====

  // Edit the characterId if you would like to use one of
  // the other pre-built host characters. Available character IDs are:
  // "Cristine", "Fiona", "Grace", "Maya", "Jay", "Luke", "Preston", "Wes"
  const characterId = "Cristine";
  const pollyConfig = { pollyVoice: "Joanna", pollyEngine: "neural" };
  const characterConfig = HostObject.getCharacterConfig(
    "./assets/character-assets",
    characterId
  );
  host = await HostObject.createHost(scene, characterConfig, pollyConfig);

  // Tell the host to always look at the camera.
  host.PointOfInterestFeature.setTarget(scene.activeCamera);

  // Enable shadows.
  //scene.meshes.forEach((mesh) => {
   // shadowGenerator.addShadowCaster(mesh);
  //});

  return scene;
}

function initUi(sessionId) {
  submitButton = document.getElementById("submitButton");
  submitButton.onclick = speak.bind(this, sessionId);
}

async function speak(sessionId) {
  // Temporarily disable the submit button.
  submitButton.disabled = true;
  submitButton.innerHTML = "Processing...";

  // Stop any speech that may be playing.
  host.TextToSpeechFeature.stop();

  // Call our Amplify API to generate text.
  const userPrompt = document.getElementById("promptInput").value;
  const apiParams = {
    queryStringParameters: {
      userPrompt,
      chatHistory
    },
  };
  const completion = await API.get("textGenAPI", "/generateText", apiParams);
  console.log(completion.answer);
  chatHistory = completion.chatHistory
  // Re-enable the submit button.
  submitButton.disabled = false;
  submitButton.innerHTML = "Ask a Question";

  // const speech = document.getElementById('speechText').value;
  host.TextToSpeechFeature.play(completion.answer);
}

DemoUtils.loadDemo(createScene);
