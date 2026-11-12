import fs from "fs";
import path from "path";

const sampleData = `Candidate Name,Candidate Email,Phone Number,Location,Headline / Skills,Resume Link
Kavitha Sundaram,kavitha.sample@gmail.com,+91 94441 12345,"Chennai, Tamil Nadu","B.Com Marketing, Cold Outreach, B2B Lead Generation",https://drive.google.com/sample/kavitha.pdf
Siddharth Rao,siddharth.sample@gmail.com,+91 98450 67890,"Bengaluru, Karnataka","BBA, Market Research, Client Communication, CRM Tools",https://drive.google.com/sample/siddharth.pdf
Manoj Kumar,manoj.sample@gmail.com,+91 97890 23456,"Coimbatore, Tamil Nadu","B.Sc Visual Communication, Sales Prospecting, Social Media",https://drive.google.com/sample/manoj.pdf
Ananya Deshmukh,ananya.sample@gmail.com,+91 99201 34567,"Pune, Maharashtra","B.Com, Financial Analysis, Client Pitching, Excel",https://drive.google.com/sample/ananya.pdf
Harish Basavaraj,harish.sample@gmail.com,+91 97410 45678,"Hubballi, Karnataka","B.E. Mechanical, Business Strategy, B2B Sales, Lead Qualifying",https://drive.google.com/sample/harish.pdf
Vigneshwaran R,vignesh.sample@gmail.com,+91 98412 56789,"Madurai, Tamil Nadu","BBA Graduate, Client Outreach, Hindi & Tamil Fluency",https://drive.google.com/sample/vignesh.pdf
Pranav Joshi,pranav.sample@gmail.com,+91 98190 67890,"Mumbai, Maharashtra","B.Com, Business Development, Inside Sales, HubSpot",https://drive.google.com/sample/pranav.pdf
Preethi Shenoy,preethi.sample@gmail.com,+91 98860 78901,"Mangalore, Karnataka","MBA Marketing, Key Account Management, Market Research",https://drive.google.com/sample/preethi.pdf
Senthil Nathan,senthil.sample@gmail.com,+91 98940 89012,"Trichy, Tamil Nadu","B.Sc Computer Science, Lead Generation, Cold Calling",https://drive.google.com/sample/senthil.pdf
Roshni Varghese,roshni.sample@gmail.com,+91 94470 90123,"Kochi, Kerala","BBA, Content Marketing, Client Onboarding, Presentation",https://drive.google.com/sample/roshni.pdf
`;

const filePath = path.join(process.cwd(), "sample_indeed_applicants.csv");
fs.writeFileSync(filePath, sampleData, "utf-8");
console.log(`Created sample Indeed CSV file at: ${filePath}`);

