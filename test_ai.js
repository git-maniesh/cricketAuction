import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function check() {
    let log = "";
    try {
        log += "Attempting to list models directly via flash endpoint...\n";
        // Let's try to just hit a very generic model.
        
        // Is there any model that is guaranteed to work?
        // gemini-pro was the original one.
        
        // Wait, maybe the region is restricted?
        // Let's try gemini-1.5-flash-latest again.
        
        const models = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-pro"];
        for(let m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                log += `SUCCESS: ${m} works!\n`;
            } catch (err) {
                log += `FAIL: ${m} -> ${err.message}\n`;
            }
        }

    } catch (e) {
        log += "CRITICAL: " + e.message + "\n";
    }
    fs.writeFileSync('ai_diag.txt', log, 'utf8');
}

check();
