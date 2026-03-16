import unittest
from app.services.ahp_service import compute_ahp_weights
from pydantic import BaseModel

class MockEntry(BaseModel):
    criteria_id_row: int
    criteria_id_col: int
    value: float

class TestAHPService(unittest.TestCase):
    def test_compute_ahp_weights_3x3(self):
        criteria_ids = [1, 2, 3]
        entries = [
            MockEntry(criteria_id_row=1, criteria_id_col=2, value=3.0),
            MockEntry(criteria_id_row=1, criteria_id_col=3, value=5.0),
            MockEntry(criteria_id_row=2, criteria_id_col=3, value=2.0)
        ]
        
        result = compute_ahp_weights(entries, criteria_ids)
        
        self.assertIn("weights", result)
        self.assertIn("ci", result)
        self.assertIn("cr", result)
        self.assertIn("is_consistent", result)
        
        # Check that weights sum to roughly 1
        total_weight = sum(result["weights"].values())
        self.assertAlmostEqual(total_weight, 1.0, places=5)
        
        # Check that expected order holds: W1 > W2 > W3
        w1 = result["weights"].get(1)
        w2 = result["weights"].get(2)
        w3 = result["weights"].get(3)
        self.assertTrue(w1 > w2)
        self.assertTrue(w2 > w3)

if __name__ == '__main__':
    unittest.main()
