import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function check() {
    let log = "";
    const models = [
        "gemini-2.0-flash",
        "gemini-2.5-flash", 
        "gemini-2.5-flash-lite", 
        "gemini-3.1-pro",
        "gemini-1.5-flash" // checking just in case
    ];
    
    for(let m of models) {
        try {
            log += `Testing model: ${m}...\n`;
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Respond with 'READY'");
            log += `SUCCESS: ${m} is working! Response: ${result.response.text().substring(0, 10)}\n`;
            break; 
        } catch (err) {
            log += `FAIL: ${m} -> ${err.message}\n`;
        }
    }
    fs.writeFileSync('ai_modern_test.txt', log, 'utf8');
}

check();
