/**
 * THE content file. The site (Research Atlas at /) and the hidden Editorial style
 * (src/app/_editorial) read from this object, so editing it updates the whole site.
 *
 * Rules:
 * - Only verified facts are written as plain values.
 * - Anything not verified yet has `placeholder: true` and a `// TODO` comment;
 *   it renders with a small "TODO" badge while `showPlaceholderBadges` is true.
 * - Search this file for "TODO" to find everything that still needs your input.
 */
import photoFraming from "./photo-framing.json";
import type { SiteContent } from "./types";

// Availability note ("Looking to start a PhD …"). Set to true to show it again in the hero,
// the metadata and the Editorial sidebar/contact. While false the text is not rendered
// anywhere, and the build drops it from the HTML and the JS bundles too.
const showAvailability = false;

export const site: SiteContent = {
  person: {
    name: "Alessandro Viespoli",
    role: "Software Development Engineer",
    employer: "Amazon",
    showAvailability,
    availability: showAvailability ? "Looking to start a PhD · computer vision & robotics" : undefined,
    affiliation: "University of Padova (UniPD)",
    department: "Department of Information Engineering (DEI)",
    location: "Madrid, Spain",
    photo: {
      src: "/images/profile.jpg",
      alt: "Alessandro Viespoli at his graduation, wearing a laurel wreath",
      // Pixel size of profile.jpg (keep in sync when replacing the file; a test checks it).
      width: 768,
      height: 1024,
      // Size and position are set in the photo admin (README → "Photo admin").
      framing: photoFraming,
    },
    // TODO: rewrite bio in your own words
    bio: [
      "I am a Software Engineer at Amazon, where I work on machine learning systems that spot emerging shopping trends across international marketplaces and match them to the right products. I joined full time in 2026, after an internship in 2025.",
      "I studied Computer Engineering at the University of Padova, where I earned my B.Sc. and then my M.Sc. in AI & Robotics, both with maximum grades. Computer vision and robotics are what I enjoy most. I like exploring every aspect of AI, and that is why in my free time I conduct research with the University of Padova.",
      "Away from the keyboard I am usually planning my next trip, often to Asia, whose culture I love, from anime to K-pop. I have been a video game fan for as long as I can remember, I like cooking, and I used to play basketball.",
    ],
    // Only shown by the hidden Editorial style (the Atlas hero no longer renders interest tags).
    interests: ["Computer vision", "Robotics", "Efficient vision transformers"],
    links: [
      { label: "GitHub", href: "https://github.com/zincalex", kind: "github" },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/alessandroviespoli/",
        kind: "linkedin",
      },
      { label: "Email", href: "mailto:alessandro.viesp@gmail.com", kind: "email" },
      {
        label: "Google Scholar",
        href: "https://scholar.google.com/citations?user=xgo8Xj0AAAAJ&hl=it",
        kind: "scholar",
      },
      { label: "ORCID", href: "https://orcid.org/0009-0005-6288-9663", kind: "orcid" },
      { label: "CV", href: "/cv.pdf", kind: "cv" },
    ],
  },
  // Atlas landing hero (src/themes/atlas/landing/). The About block lives in the hero.
  hero: {
    // Bold sans line under the name.
    headline: "Software engineer at Amazon",
    ctas: [
      { label: "View research", href: "#publications", variant: "solid" },
      { label: "Get in touch", href: "#contact", variant: "outline" },
    ],
  },
  // Technical skills shown in the Atlas marquee (grouped by category).
  skills: [
    {
      id: "code",
      label: "Code",
      items: ["Python", "C++", "Java", "C", "TypeScript", "HTML/CSS", "SQL"],
    },
    {
      id: "agents",
      label: "Agent workflows",
      items: ["Claude", "Codex", "Prompt & context engineering", "Strands Agents SDK"],
    },
    {
      id: "aws",
      label: "AWS",
      items: [
        "Lambda", // TODO: confirm
        "S3", // TODO: confirm
        "DynamoDB", // TODO: confirm
        "CDK", // TODO: confirm
      ],
    },
    {
      id: "libraries",
      label: "Libraries",
      items: [
        "PyTorch",
        "Hugging Face Transformers",
        "OpenCV",
        "TensorFlow",
        "ROS",
        "MoveIt",
        "Gazebo",
        "PySpark",
        "Scikit-learn",
      ],
    },
    {
      id: "os",
      label: "Operating systems",
      items: [
        "Linux",
        "macOS", // TODO: confirm
        "Windows",
      ],
    },
  ],
  publications: [
    {
      id: "vit-depth-pruning",
      title:
        "Retraining-Free Depth Pruning of Vision Transformers: A Cross Domain Study of Layer Redundancy",
      authors: ["Alessandro Viespoli", "Loris Nanni"],
      venue: "Expert Systems with Applications",
      venueShort: "ESWA",
      year: 2026, // TODO: verify
      status: "under-review",
      abstract:
        "We adapt training-free, similarity-based layer dropping from LLM-Drop to vision transformers (ViT, DeiT, DINOv2, DINOv3 and SwinV2) and compare four strategies: Block, Attention, MLP and Joint Layer Drop. Pruned models are evaluated with a frozen-backbone linear-probe classification benchmark across many downstream datasets, together with speed, FLOPs and energy measurements, statistical difference and equivalence tests, and automated model selection.",
      links: [
        { label: "Code", href: "https://github.com/zincalex/ViT-Drop", kind: "code" },
        { label: "arXiv", href: "https://arxiv.org/abs/2610.15005", kind: "arxiv" },
      ],
      // TODO: replace with official BibTeX
      bibtex: `@misc{viespoli2026retrainingfree,
  title  = {Retraining-Free Depth Pruning of Vision Transformers: A Cross Domain Study of Layer Redundancy},
  author = {Viespoli, Alessandro and Nanni, Loris},
  year   = {2026},
  note   = {Under review at Expert Systems with Applications}
}`,
    },
  ],

  // Shown in this order. Tags are only the languages and libraries listed in the CV.
  projects: [
    {
      id: "vit-drop",
      title: "ViT-Drop",
      summary:
        "Retraining-free depth pruning for vision transformers: ranks attention, MLP and whole blocks by similarity and drops the most redundant ones, tested on ViT, DeiT, DINOv2, DINOv3 and SwinV2 across 12 downstream datasets. Removing 20% of DINOv2 blocks gives 24% higher throughput at under 1% relative accuracy loss.",
      tags: ["Python", "PyTorch", "Hugging Face"],
      category: "vision",
      links: [{ label: "Code", href: "https://github.com/zincalex/ViT-Drop", kind: "code" }],
    },
    {
      id: "polo-cv",
      title: "POLO-CV",
      summary:
        "Parking Occupancy and Lot Observation: detects parking spaces, determines their occupancy and segments every car in the frame using classical computer vision only (no deep learning), with a 2D top-view map of the lot. Average 0.75 mAP and 0.9 mIoU.",
      tags: ["C++", "OpenCV", "CMake"],
      category: "vision",
      links: [{ label: "Code", href: "https://github.com/zincalex/POLO-CV", kind: "code" }],
    },
    {
      id: "eurosat-land-cover",
      title: "Land Cover Classification (EuroSAT)",
      summary:
        "Deep learning techniques to classify 13-channel Sentinel-2 satellite images: an ensemble of ResNet-50 and DenseNet-161, plus a PCA analysis, reaching 96.9% accuracy.",
      tags: ["Python", "PyTorch"],
      category: "vision",
      links: [
        {
          label: "Code",
          href: "https://github.com/zincalex/Land_Cover_Classification_EUROSAT",
          kind: "code",
        },
      ],
    },
    {
      id: "tiago-apriltag-quest",
      title: "TIAGo AprilTag Quest",
      summary:
        "A TIAGo robot explores a simulated lab, finds the AprilTags requested by a server and reports their positions on the map, then picks objects with MoveIt and places them along a given line.",
      collaborators: ["Kabir Bertan", "Giovanni Cinel"],
      tags: ["C++", "ROS1"],
      category: "robotics",
      links: [
        { label: "Code", href: "https://github.com/zincalex/tiago-apriltag-quest", kind: "code" },
      ],
      media: [
        {
          src: "https://raw.githubusercontent.com/zincalex/tiago-apriltag-quest/main/media/quest1.gif",
          alt: "TIAGo exploring the simulated lab to localize AprilTags",
        },
        {
          src: "https://raw.githubusercontent.com/zincalex/tiago-apriltag-quest/main/media/quest2.gif",
          alt: "TIAGo placing objects along a line on the delivery table",
        },
      ],
    },
    {
      id: "hyra",
      title: "HYRA",
      summary:
        "HighwaY Reinforcement Agents: DQN, Dueling DQN and PPO agents learning to drive in HighwayEnv.",
      tags: ["Python"],
      category: "ml",
      links: [{ label: "Code", href: "https://github.com/zincalex/HYRA", kind: "code" }],
    },
    {
      id: "gatto",
      title: "GATTO",
      summary:
        "Graph Attention Network with TOpological information for node classification on citation networks (Cora, Citeseer).",
      tags: ["Python"],
      category: "ml",
      links: [{ label: "Code", href: "https://github.com/zincalex/GATTO", kind: "code" }],
    },
  ],

  // Bullet points are the CV's, verbatim.
  experience: [
    {
      title: "Software Development Engineer",
      org: "Amazon",
      location: "Madrid, Spain",
      period: "Jun 2026 – present",
      details: [
        "Maintained a ML pipeline that detects emerging trends and matches them to relevant products across multiple international marketplaces.",
        "Contributed to an automated merchandising system that turns top-ranked trends into storefront content.",
        "Implemented a model monitoring framework for the production ML system that combines LLM-as-a-judge evaluation with human annotation, surfacing quality issues for action and building a labeled dataset for future model improvements.",
        "Applied SDE best practices to deliver high-quality, well-tested code through unit testing, code reviews and CI/CD pipelines.",
      ],
    },
    {
      title: "Research collaboration",
      org: "University of Padova",
      location: "Padova, Italy",
      period: "Oct 2025 – present",
      details: [
        "Independent research carried out in my free time: retraining-free depth pruning of vision transformers.",
      ],
    },
    {
      title: "Software Development Engineer Intern",
      org: "Amazon",
      location: "Madrid, Spain",
      period: "Mar 2025 – Sep 2025",
      details: [
        "Implemented full-stack solutions using Java, TypeScript, HTML/CSS, including comprehensive testing, monitoring, and documentation.",
        "Enhanced and optimized Amazon Business homepage widget leading to 61.5% increased user interactions and 51.2% improvement in customer purchasing behavior.",
        "Led technical investigation and optimization of critical widget functionality.",
        "Developed an AI-powered documentation assistant using Strands Agents SDK (Python) during an internal hackathon, creating a multi-agent system for standardizing wiki content creation through code base knowledge access; project selected for internal team deployment.",
      ],
    },
  ],

  // Courses are the CV's, verbatim; grades are its final scores (110/110 with honors = cum laude).
  education: [
    {
      title: "M.Sc. Computer Engineering — AI & Robotics",
      org: "University of Padova",
      location: "Padova, Italy",
      period: "Oct 2023 – Mar 2026",
      grade: "110/110 cum laude · GPA 4.0",
      courses: [
        "Deep Learning",
        "Computer Vision",
        "Machine Learning",
        "Artificial Intelligence",
        "NLP",
        "Reinforcement Learning",
        "Intelligent robotics",
        "Industrial robotics",
        "Learning from networks",
        "Big Data",
        "Game theory",
        "Operation Research",
        "Automata Languages",
      ],
    },
    {
      title: "B.Sc. Computer Engineering",
      org: "University of Padova",
      location: "Padova, Italy",
      period: "Sep 2020 – Sep 2023",
      grade: "110/110 cum laude · GPA 3.76",
      courses: [
        "Artificial Intelligence",
        "Databases",
        "Data structures & algorithms",
        "Operative Systems",
        "Computer architectures",
        "Computer networks",
        "Control Theory",
        "Electronics",
        "Discrete Math",
        "Probability",
        "Linear Algebra",
        "Calculus 1 & 2",
        "Physics 1 & 2",
        "Project Management",
        "Software Engineering",
      ],
    },
  ],

  honors: [
    {
      title: "Huawei Seeds for the Future Program",
      location: "Remote",
      date: "2022-10",
      details:
        "Selected as one of the 50 best Italian ICT talents for the learning program; top 2 finalist in the team hackathon “Tech4Good”.",
    },
  ],
  // ISO 3166-1 alpha-2 codes; `note` shows up in the Editorial chips and tooltips.
  visitedCountries: [
    { iso2: "IT", note: "Home" },
    { iso2: "PT" },
    { iso2: "ES" },
    { iso2: "FR" },
    { iso2: "GB", note: "London, Scotland" },
    { iso2: "IE" },
    { iso2: "DE" },
    { iso2: "BE", note: "Brussels" },
    { iso2: "NL" },
    { iso2: "DK" },
    { iso2: "SE" },
    { iso2: "AT" },
    { iso2: "CH" },
    { iso2: "SI" },
    { iso2: "HR" },
    { iso2: "ME" },
    { iso2: "GR" },
    { iso2: "TN" },
    { iso2: "EG" },
    { iso2: "CN" },
    { iso2: "IN" },
    { iso2: "JP" },
    { iso2: "TW" },
    { iso2: "US" },
  ],
  nav: [
    { id: "about", label: "About" },
    { id: "publications", label: "Publications" },
    { id: "experience", label: "Experience" },
    { id: "education", label: "Education" },
    { id: "projects", label: "Projects" },
    { id: "honors", label: "Honors" },
    { id: "countries", label: "Travel" },
    { id: "contact", label: "Contact" },
  ],
  showPlaceholderBadges: true,
};
