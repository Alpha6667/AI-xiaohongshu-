import tempfile
import unittest
from pathlib import Path

from app.models.enums import PostStatus
from app.models.post import Post
from app.repositories.memory import InMemoryRepository, now_iso


class RepositoryPersistenceTests(unittest.TestCase):
    def test_save_and_reload_posts(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            storage_path = Path(temp_dir) / "repository.json"
            repo = InMemoryRepository(storage_path=storage_path)

            created_at = now_iso()
            post = Post(
                id="post_persist_test",
                topic="持久化测试",
                title="持久化标题",
                body="持久化正文",
                tags=["test"],
                status=PostStatus.DRAFT,
                created_at=created_at,
                updated_at=created_at,
            )

            repo.posts[post.id] = post
            repo.save()

            reloaded_repo = InMemoryRepository(storage_path=storage_path)
            self.assertIn(post.id, reloaded_repo.posts)
            self.assertEqual(reloaded_repo.posts[post.id].title, "持久化标题")


if __name__ == "__main__":
    unittest.main()
