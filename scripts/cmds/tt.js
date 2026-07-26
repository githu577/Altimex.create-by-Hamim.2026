const axios = require("axios");

module.exports = {
 config: {
 name: "tt",
 version: "4.0.0",
 author: "MJ HAMIM",
 countDown: 3,
 role: 0,
 shortDescription: {
 bn: "TikTok প্রোফাইলের তথ্য ও ছবি দেখায়",
 en: "Fetches TikTok profile info and picture"
 },
 longDescription: {
 bn: "TikTok username দিলে তার follower, likes, bio এবং profile pic টেক্সট আকারে পাঠিয়ে দেয়।",
 en: "Get TikTok profile details and photo easily."
 },
 category: "media",
 guide: {
 bn: "{pn} [username]",
 en: "{pn} [username]"
 }
 },

 onStart: async function ({ api, event, args, message }) {
 try {
 let username = args[0];
 if (!username) {
 return message.reply("⚠️ ইউজারনেম দিতে ভুলে গেছেন!\nউদাহরণ: .tt tiktok");
 }

 username = username.replace("@", "").trim();

 const apis = [
 `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`,
 `https://api.tiklydown.eu.org/api/download?url=https://www.tiktok.com/@${username}`
 ];

 let u = null;
 let s = {};

 // Fetch from working API
 for (const apiUrl of apis) {
 try {
 const res = await axios.get(apiUrl, {
 headers: {
 "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
 },
 timeout: 5000
 });

 if (res.data && res.data.data && res.data.data.user) {
 u = res.data.data.user;
 s = res.data.data.stats || {};
 break;
 } else if (res.data && res.data.author) {
 u = res.data.author;
 s = res.data.stats || {};
 break;
 }
 } catch (e) {
 continue;
 }
 }

 if (!u) {
 return message.reply(`❌ "${username}" নামের টিকটক আইডিটি পাওয়া যায়নি! ইউজারনেম চেক করুন।`);
 }

 // Extract Info
 const name = u.nickname || u.uniqueId || username;
 const handle = `@${u.uniqueId || username}`;
 const avatarUrl = u.avatarLarger || u.avatarMedium || u.avatar || u.avatarThumb;
 const bio = u.signature || "কোনো বায়ো দেওয়া নেই।";
 const isVerified = u.verified ? "Yes (✅ Verified)" : "No (❌)";

 const followers = formatNumber(s.followerCount || u.followers || 0);
 const likes = formatNumber(s.heartCount || u.likes || 0);
 const following = formatNumber(s.followingCount || u.following || 0);
 const totalVideos = formatNumber(s.videoCount || u.videoCount || 0);

 // Message Body
 const infoMsg = `🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 𝐈𝐍𝐅𝐎 🎵\n` +
 `━━━━━━━━━━━━━━━━━━━\n` +
 `👤 𝐍𝐚𝐦𝐞: ${name}\n` +
 `🏷️ 𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞: ${handle}\n` +
 `✅ 𝐕𝐞𝐫𝐢𝐟𝐢𝐞𝐝: ${isVerified}\n\n` +
 `👥 𝐅𝐨𝐥𝐥𝐨𝐰𝐞𝐫𝐬: ${followers}\n` +
 `❤️ 𝐓𝐨𝐭𝐚𝐥 𝐋𝐢𝐤𝐞𝐬: ${likes}\n` +
 `➕ 𝐅𝐨𝐥𝐥𝐨𝐰𝐢𝐧𝐠: ${following}\n` +
 `🎬 𝐓𝐨𝐭𝐚𝐥 𝐕𝐢𝐝𝐞𝐨𝐬: ${totalVideos}\n\n` +
 `📝 𝐁𝐢𝐨:\n${bio}\n` +
 `━━━━━━━━━━━━━━━━━━━`;

 // Stream Profile Picture Stream directly
 const imgStream = (await axios.get(avatarUrl, { responseType: "stream" })).data;

 return message.reply({
 body: infoMsg,
 attachment: imgStream
 });

 } catch (error) {
 console.error(error);
 return message.reply("❌ ডাটা ফ্রেচ করতে সমস্যা হয়েছে, ইউজারনেম চেক করে আবার চেষ্টা করুন।");
 }
 }
};

function formatNumber(num) {
 if (!num || isNaN(num)) return "0";
 num = Number(num);
 if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
 if (num >= 1000) return (num / 1000).toFixed(1) + "K";
 return num.toLocaleString();
}
