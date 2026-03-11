# MediaBillingNotebook

Jupyter notebooks for Media Billing Reconciliation and Campaign Generation demos.

## 📁 Structure

```
MediaBillingNotebook/
├── MediaBillingCrew.ipynb         # Main campaign generation demo
├── examples/                      # Example notebooks
├── data/                          # Sample data files
└── README.md                      # This file
```

## 📓 Notebooks

### MediaBillingCrew.ipynb
Full demonstration of the CrewAI multi-agent campaign generation system.

**Features:**
- Multi-format file parsing (PDF, CSV, XML, Images)
- 4 specialized AI agents:
  - Market Research Analyst
  - Content Strategy Director
  - Social Media Marketing Manager
  - Email Marketing Specialist
- Step-by-step campaign generation
- Integration with OpenAI GPT-4o

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Jupyter Notebook or JupyterLab
- Virtual environment (shared with backend)

### Setup

1. **Activate virtual environment:**
   ```bash
   cd "/Users/kgour01/Library/CloudStorage/OneDrive-dentsu/Desktop/nXT24 Bootcamp"
   source venv/bin/activate
   ```

2. **Install Jupyter (if not installed):**
   ```bash
   pip install jupyter jupyterlab ipykernel
   ```

3. **Start Jupyter:**
   ```bash
   cd MediaBillingNotebook
   jupyter notebook
   # OR
   jupyter lab
   ```

4. **Open notebook:**
   - Navigate to `MediaBillingCrew.ipynb`
   - Run cells sequentially

## 🔧 Environment Variables

Ensure `.env` file exists in the backend directory with:
```env
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
```

## 📚 Notebook Content

### MediaBillingCrew.ipynb includes:

1. **Setup & Configuration**
   - Import libraries
   - Load environment variables
   - Initialize AI models

2. **File Parsing Examples**
   - PDF parsing
   - CSV data extraction
   - XML processing
   - Image text extraction

3. **CrewAI Agent Setup**
   - Define 4 specialized agents
   - Configure agent roles and goals
   - Set up agent tools

4. **Campaign Generation**
   - Run full campaign workflow
   - Market research
   - Content strategy
   - Social media plan
   - Email campaign

5. **Results & Analysis**
   - Display campaign outputs
   - Export results
   - Performance metrics

## 💡 Usage Tips

- **Run cells in order**: Dependencies build sequentially
- **API key required**: Set OPENAI_API_KEY before running
- **Processing time**: Full campaign takes 2-3 minutes
- **Restart kernel**: If you encounter errors, try Kernel > Restart

## 🔗 Integration

This notebook works standalone or can be integrated with:
- **Backend API**: Located in `MediaBillingReconcilliationBackend/`
- **Frontend UI**: Located in `MediaBillingReconcilliation/`

## 📝 Notes

- The notebook uses the same backend logic as the Flask API
- All file parsers are available in the notebook
- Results can be exported to JSON or CSV
- Supports batch processing of multiple products

## 🧪 Testing

Run example cells to test:
```python
# Test file parsing
from utils.file_parsers import parse_file
result = parse_file('data/sample.pdf')
print(result)

# Test campaign generation
from services.campaign_notebook import run_campaign
campaign = run_campaign('Product Name', pdf_content='...')
```

## 📖 Additional Resources

- [CrewAI Documentation](https://docs.crewai.com)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Jupyter Notebook Guide](https://jupyter-notebook.readthedocs.io)

## 🤝 Contributing

To add new notebooks:
1. Create in `examples/` directory
2. Follow naming convention: `YourFeature_Demo.ipynb`
3. Include markdown cells explaining each step
4. Add to this README

---

**Last Updated**: November 13, 2025
