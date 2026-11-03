
export interface ArticleProps {
  title: string;
  description: string;
}

export const Article = (props: ArticleProps) => {
  return (
    <article>
      <h2>{props.title}</h2>
      <p>{props.description}</p>
    </article>
  );
};
