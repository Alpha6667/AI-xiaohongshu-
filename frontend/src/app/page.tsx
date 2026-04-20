const cards = [
  { title: "内容工作台", description: "输入主题、生成文案、上传图片、提交审核" },
  { title: "帖子列表", description: "查看草稿、审核中、已发布和失败任务" },
  { title: "数据看板", description: "查看浏览、点赞、收藏、评论和关注转化" },
];

export default function HomePage() {
  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif", background: "#f7f8fb", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: 8 }}>AI Xiaohongshu Posting Platform</h1>
      <p style={{ marginTop: 0, color: "#555" }}>第一版后台骨架已经初始化，后续可继续补齐内容工作台、审核流和数据看板。</p>
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 24 }}>
        {cards.map((card) => (
          <article key={card.title} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{card.title}</h2>
            <p style={{ marginBottom: 0, color: "#666", lineHeight: 1.6 }}>{card.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
