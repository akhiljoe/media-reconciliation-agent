# iPhone 17 Marketing Campaign Generator

🚀 **AI-Powered Marketing in Minutes** - A production-ready React + Vite application that uses OpenAI GPT-4o to generate complete marketing campaigns.

## ✨ Features

- **Market Research**: Automated competitor analysis and target audience profiling
- **Content Strategy**: AI-generated taglines, product descriptions, and USPs
- **Social Media Campaign**: Instagram posts and Twitter threads ready to go viral
- **Email Marketing**: Conversion-focused email campaigns with A/B versions
- **Real-time Progress Tracking**: Watch as AI agents work sequentially
- **Beautiful UI**: Modern, responsive design with smooth animations
- **Export Results**: Download complete campaigns as JSON

## 🛠️ Tech Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **OpenAI GPT-4o** - Advanced language model
- **CSS3** - Custom styling with gradients and animations

## 📋 Prerequisites

- Node.js 16+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- npm or yarn package manager

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm run preview
```

## 📖 How to Use

1. **Enter Product Name**: Type your product (e.g., "iPhone 17", "Tesla Model X")
2. **Click Generate**: Watch as 4 AI agents work sequentially
3. **View Results**: Get comprehensive marketing materials instantly
4. **Download**: Export your campaign as JSON for later use

## 🤖 AI Agents Workflow

The app uses 4 specialized AI agents:

```
1. Market Researcher
   ↓ (analyzes market, competitors, audience)
2. Content Strategist  
   ↓ (creates taglines, descriptions, USPs)
3. Social Media Expert
   ↓ (designs viral campaigns)
4. Email Marketer
   ↓ (crafts conversion emails)
   
= Complete Campaign Ready! 🎉
```

## 📁 Project Structure

```
Iphone17CampaignUI/
├── src/
│   ├── components/          # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CampaignGenerator.tsx
│   │   ├── ProgressTracker.tsx
│   │   └── ResultsDisplay.tsx
│   ├── services/           # API services
│   │   ├── llm.ts         # OpenAI integration
│   │   └── campaign.ts    # Campaign generation logic
│   ├── types/             # TypeScript types
│   ├── config/            # Configuration
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies
└── .env                  # Environment variables (not committed)
```

## 🔒 Security Notes

⚠️ **Important**: This app uses `dangerouslyAllowBrowser: true` for OpenAI client, which is **NOT recommended for production**.

### Production Recommendations:

1. **Create a Backend API**:
   - Build a Node.js/Express backend
   - Move OpenAI calls to the backend
   - Never expose API keys in the frontend

2. **Add Authentication**:
   - Implement user authentication
   - Rate limiting to prevent abuse
   - Usage tracking for cost control

3. **Environment Variables**:
   - Use proper secrets management
   - Never commit `.env` to version control
   - Use different keys for dev/prod

## 💰 Cost Estimation

Approximate OpenAI API costs per campaign generation:

- **Tokens per campaign**: ~5,000-8,000 tokens
- **Cost with GPT-4o**: ~$0.15-$0.24 per campaign
- **Monthly (100 campaigns)**: ~$15-$24

## 🎨 Customization

### Change Product Focus

Modify the default product in `CampaignGenerator.tsx`:

```typescript
const [productName, setProductName] = useState('Your Product');
```

### Adjust AI Behavior

Edit prompts in `src/services/campaign.ts`:

```typescript
const systemPrompt = `You are a...`; // Customize agent behavior
const prompt = `Create...`; // Customize task instructions
```

### Styling

All styles are in component-specific CSS files:
- `*.css` files next to each component
- Global styles in `src/index.css`
- Color scheme variables easily changeable

## 🐛 Troubleshooting

### "Cannot find module" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### API key not working
- Check `.env` file has correct format
- Restart dev server after changing `.env`
- Verify key is valid at OpenAI dashboard

### Build errors
```bash
npm run lint
npm run build
```

## 📝 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check OpenAI API status
- Review the documentation

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- React team for amazing framework
- Vite team for blazing-fast tooling

---

**Built with ❤️ using React, TypeScript, and OpenAI**
