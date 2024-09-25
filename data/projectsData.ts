interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'VS Code AI Commit',
    description: `The Commit AI Visual Studio Code extension is a powerful tool that allows users to effortlessly generate commit messages using popular commit message norms through the OpenAI API. With this extension, you can streamline your code commit process, ensuring that your version control history is organized and informative.`,
    imgSrc: '/static/images/vs-code-commit.png',
    href: '/blog/vs-code-commit',
  },
]

export default projectsData
