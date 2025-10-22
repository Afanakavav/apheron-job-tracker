// Test script to check available Gemini models
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDQ8iw-kQf-Des8uPiQKZYgTcqPwoZcTaw';
const genAI = new GoogleGenerativeAI(API_KEY);

async function testModels() {
  const models = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  
  console.log('Testing available models...\n');
  
  for (const modelName of models) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      console.log(`✅ ${modelName} - WORKS!`);
      console.log(`   Response: ${response.text().substring(0, 50)}...\n`);
    } catch (error) {
      console.log(`❌ ${modelName} - FAILED`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

testModels();

