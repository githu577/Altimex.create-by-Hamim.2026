const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

// === API utils ===
async function getStreamFromURL(url) {
  const res = await axios.get(url, { responseType: "stream" });
  return res.data;
}

function generateRandomId(len = 16) {
  const chars = "abcdef0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function getBalance() {
  const pack = generateRandomId();
  await axios.post("https://api.getglam.app/rewards/claim/hdnu30r7auc4kve", null, {
    headers: {
      "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)",
      "glam-user-id": pack,
      "user_id": pack,
      "glam-local-date": new Date().toISOString(),
    },
  });
  return pack;
}

async function uploadFile(pack, stream, prompt, duration) {
  const form = new FormData();
  form.append("package_id", pack);
  form.append("media_file", stream);
  form.append("media_type", "image");
  form.append("template_id", "community_img2vid");
  form.append("template_category", "20_coins_dur");
  form.append("frames", JSON.stringify([{
    prompt,
    custom_prompt: prompt,
    start: 0,
    end: 0,
    timings_units: "frames",
    media_type: "image",
    style_id: "chained_falai_img2video",
    rate_modifiers: { duration: duration.toString() + "s" },
  }]));

  const res = await axios.post("https://android.getglam.app/v2/magic_video", form, {
    headers: { ...form.getHeaders(), "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)" },
  });

  return res.data.event_id;
}

// === Status checker with 15-minute max execution window & polling optimization ===
async function getStatus(taskID, pack) {
  const startTime = Date.now();
  const maxWaitTime = 15 * 60 * 1000; // ১৫ মিনিট সময়সীমা (15 Minutes)

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const res = await axios.get("https://android.getglam.app/v2/magic_video", {
        params: { package_id: pack, event_id: taskID },
        headers: { "User-Agent": "Glam/1.58.4 Android/32 (Samsung SM-A156E)" },
      });

      if (res.data.status === "READY") {
        return [res.data];
      } else if (res.data.status === "FAILED") {
        throw new Error("API-তে ভিডিও জেনারেশন ফেল করেছে!");
      }
    } catch (e) {
      // নেটওয়ার্ক সাময়িক ড্রপ করলে ক্যাচ ব্যাক করবে
    }
    
    // ৫ সেকেন্ড পর পর স্ট্যাটাস চেক করবে
    await new Promise(r => setTimeout(r, 5000));
  }
  
  throw new Error("ভিডিও জেনারেট হতে ১৫ মিনিটের বেশি সময় লেগেছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
}

async function imgToVideo(prompt, filePath, duration = 5) {
  const pack = await getBalance();
  const task = await uploadFile(pack, fs.createReadStream(filePath), prompt, duration);
  return await getStatus(task, pack);
}

// === High-Res Avatar fetch ===
async function getAvatar(uid, usersData) {
  let url = null;
  try {
    url = await usersData.getAvatarUrl(uid);
  } catch (e) {}
  if (!url) {
    url = `https://graph.facebook.com/${uid}/picture?width=1024&height=1024`;
  }
  return url;
}

// === High Quality Image Merge ===
async function mergeAvatars(url1, url2) {
  const img1 = await loadImage(url1);
  const img2 = await loadImage(url2);
  
  // রেজোলিউশন ১০২৪x১০২৪ এ বাড়ানো হলো Ultra HD লুকের জন্য
  const width = 1024;
  const height = 1024;

  const canvas = createCanvas(width * 2, height);
  const ctx = canvas.getContext("2d");

  // স্মুথ ইমেজ রেন্ডারিং সেটআপ
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img1, 0, 0, width, height);
  ctx.drawImage(img2, width, 0, width, height);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const filePath = path.join(cacheDir, `propose_${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  return filePath;
}

// === Command Setup ===
module.exports = {
  config: {
    name: "propose",
    version: "2.0",
    author: "goku black",
    role: 0,
    description: "💍 Send an ultra-HD 5s romantic proposal animation",
    category: "love",
    guide: "Reply to someone's message with: propose"
  },

  onStart: async function ({ event, message, usersData }) {
    if (!event.messageReply || !event.messageReply.senderID) {
      return message.reply("❌ You must reply to someone's message to propose 💍");
    }

    const uid1 = event.senderID;
    const uid2 = event.messageReply.senderID;

    // Advanced Cinematic Prompt (5 Seconds Video Focused)
    const prompt = "ultra-realistic cinematic 8k resolution, cinematic lighting, a romantic aesthetic proposal scene, beautiful anime romance style, couple in love, glowing sparkles and soft bokeh background, high quality 5-second fluid video animation";

    const waitMsg = await message.reply("💖 Generating your 5-second Cinematic Proposal Video...\n⏳ Please wait, this process can take up to 10–15 minutes during peak server traffic.");

    let mergedPath = null;

    try {
      const url1 = await getAvatar(uid1, usersData);
      const url2 = await getAvatar(uid2, usersData);

      mergedPath = await mergeAvatars(url1, url2);
      
      // Duration set to strict 5 seconds
      const result = await imgToVideo(prompt, mergedPath, 5);

      const senderName = await usersData.getName(uid1);
      const targetName = await usersData.getName(uid2);

      await message.reply({
        body: `💍 | ${senderName} is proposing to ${targetName}! 💕✨`,
        attachment: await getStreamFromURL(result[0].video_url)
      });

    } catch (err) {
      console.error("propose command error:", err);
      message.reply("❌ Error: " + (err.message || "Could not generate the proposal video. Please try again later."));
    } finally {
      // ফাইল ক্লিনআপ নিশ্চিতকরণ
      if (mergedPath && fs.existsSync(mergedPath)) {
        fs.unlinkSync(mergedPath);
      }
    }
  }
};
