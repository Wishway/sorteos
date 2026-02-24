"""
Test suite for bulk ticket validation and purchase performance optimizations.

Features tested:
1. POST /api/sorteos/{sorteo_id}/validar-numeros-bulk - Bulk number validation
2. POST /api/boletos/comprar - Optimized purchase using $in query and insert_many
3. GET /api/sorteos/{sorteo_id}/numeros-disponibles - Get available numbers
4. Backward compatibility of single validation endpoint
5. Database indexes verification (via performance)
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test sorteos from context
SORTEO_ID_20000 = "7bd04188-d569-4ea0-953f-7a160ff7af05"  # "mas de mil boletos" - 20000 tickets
SORTEO_ID_10 = "9f4c767c-b6e7-4b22-b4a3-c51a7b317415"  # "gfjhg" - 10 tickets

# Test credentials
USER_EMAIL = "usuario@test.com"
USER_PASSWORD = "password123"
ADMIN_EMAIL = "admin@wishway.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Login and get session token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Authentication failed: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestBulkValidationEndpoint:
    """Tests for POST /api/sorteos/{sorteo_id}/validar-numeros-bulk"""
    
    def test_bulk_validation_empty_list(self, api_client):
        """Test bulk validation with empty list returns all_available=True"""
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"numeros": []}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["todos_disponibles"] == True
        assert data["no_disponibles"] == []
        print("PASSED: Empty list returns todos_disponibles=True")
    
    def test_bulk_validation_available_numbers(self, api_client):
        """Test bulk validation with available numbers"""
        # First get available numbers
        avail_response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        assert avail_response.status_code == 200
        disponibles = avail_response.json()["disponibles"]
        
        if len(disponibles) < 10:
            pytest.skip("Not enough available numbers to test")
        
        # Pick 10 random available numbers
        test_numbers = disponibles[:10]
        
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"numeros": test_numbers}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["todos_disponibles"] == True
        assert len(data["no_disponibles"]) == 0
        print(f"PASSED: Bulk validation of {len(test_numbers)} numbers returns todos_disponibles=True")
    
    def test_bulk_validation_out_of_range(self, api_client):
        """Test bulk validation returns error for out of range numbers"""
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"numeros": [0, 20001, 99999]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["todos_disponibles"] == False
        assert len(data["no_disponibles"]) > 0
        assert "fuera de rango" in data.get("mensaje", "").lower() or len(data["no_disponibles"]) > 0
        print(f"PASSED: Out of range numbers detected: {data['no_disponibles']}")
    
    def test_bulk_validation_sorteo_not_found(self, api_client):
        """Test bulk validation returns 404 for non-existent sorteo"""
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/non-existent-id/validar-numeros-bulk",
            json={"numeros": [1, 2, 3]}
        )
        assert response.status_code == 404
        print("PASSED: Non-existent sorteo returns 404")
    
    def test_bulk_validation_performance_500_numbers(self, api_client):
        """Test bulk validation of 500 numbers completes in under 1 second"""
        # Get available numbers
        avail_response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        disponibles = avail_response.json()["disponibles"]
        if len(disponibles) < 500:
            pytest.skip(f"Not enough available numbers ({len(disponibles)}) to test 500")
        
        # Pick 500 numbers
        test_numbers = disponibles[:500]
        
        # Time the bulk validation
        start_time = time.time()
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"numeros": test_numbers}
        )
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"PASSED: Bulk validation of 500 numbers completed in {elapsed:.3f}s")
        assert elapsed < 1.0, f"Performance: 500-number validation took {elapsed:.3f}s (expected < 1s)"
        print(f"  - todos_disponibles: {data['todos_disponibles']}")
        print(f"  - no_disponibles count: {len(data['no_disponibles'])}")


class TestSingleValidationBackwardCompatibility:
    """Tests for backward compatibility of single validation endpoint"""
    
    def test_single_validation_available_number(self, api_client):
        """Test single number validation still works"""
        # Get an available number first
        avail_response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        disponibles = avail_response.json()["disponibles"]
        if not disponibles:
            pytest.skip("No available numbers")
        
        test_number = disponibles[0]
        
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numero",
            json={"numero": test_number}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["disponible"] == True
        print(f"PASSED: Single validation endpoint works for number {test_number}")
    
    def test_single_validation_occupied_number(self, api_client):
        """Test single validation returns unavailable for occupied numbers"""
        # Get occupied numbers
        avail_response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        ocupados = avail_response.json()["ocupados"]
        if not ocupados:
            pytest.skip("No occupied numbers to test")
        
        test_number = ocupados[0]
        
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numero",
            json={"numero": test_number}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["disponible"] == False
        print(f"PASSED: Single validation returns disponible=False for occupied number {test_number}")


class TestNumerosDisponibles:
    """Tests for GET /api/sorteos/{sorteo_id}/numeros-disponibles"""
    
    def test_get_numeros_disponibles_structure(self, api_client):
        """Test numeros-disponibles returns correct structure"""
        response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        assert response.status_code == 200
        data = response.json()
        
        assert "disponibles" in data
        assert "ocupados" in data
        assert "total" in data
        assert isinstance(data["disponibles"], list)
        assert isinstance(data["ocupados"], list)
        assert data["total"] == 20000  # Total boletos for this sorteo
        
        # Verify available + occupied = total
        available_count = len(data["disponibles"])
        occupied_count = len(data["ocupados"])
        assert available_count + occupied_count == data["total"]
        
        print(f"PASSED: numeros-disponibles structure correct")
        print(f"  - Total: {data['total']}")
        print(f"  - Disponibles: {available_count}")
        print(f"  - Ocupados: {occupied_count}")
    
    def test_get_numeros_disponibles_sorteo_not_found(self, api_client):
        """Test numeros-disponibles returns 404 for non-existent sorteo"""
        response = api_client.get(f"{BASE_URL}/api/sorteos/non-existent-id/numeros-disponibles")
        assert response.status_code == 404
        print("PASSED: Non-existent sorteo returns 404")


class TestOptimizedPurchase:
    """Tests for optimized POST /api/boletos/comprar using $in query and insert_many"""
    
    def test_purchase_with_occupied_numbers_returns_error(self, authenticated_client):
        """Test purchase fails if numbers are occupied"""
        # Get occupied numbers
        avail_response = authenticated_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        ocupados = avail_response.json()["ocupados"]
        if len(ocupados) < 2:
            pytest.skip("Not enough occupied numbers to test")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/boletos/comprar",
            json={
                "sorteo_id": SORTEO_ID_20000,
                "numeros_boletos": ocupados[:2],
                "metodo_pago": "transferencia"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "ocupados" in data["detail"].lower() or "reservados" in data["detail"].lower()
        print(f"PASSED: Purchase with occupied numbers returns 400")
        print(f"  - Detail: {data['detail']}")
    
    def test_purchase_out_of_range_returns_error(self, authenticated_client):
        """Test purchase fails for out of range numbers"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/boletos/comprar",
            json={
                "sorteo_id": SORTEO_ID_20000,
                "numeros_boletos": [0, 20001],
                "metodo_pago": "transferencia"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "rango" in data["detail"].lower()
        print(f"PASSED: Out of range numbers return 400: {data['detail']}")
    
    def test_purchase_exceeds_limit_returns_error(self, authenticated_client):
        """Test purchase of >500 tickets returns error"""
        # Generate 501 sequential numbers
        numbers = list(range(1, 502))
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/boletos/comprar",
            json={
                "sorteo_id": SORTEO_ID_20000,
                "numeros_boletos": numbers,
                "metodo_pago": "transferencia"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "500" in data["detail"] or "máximo" in data["detail"].lower()
        print(f"PASSED: Purchase of 501 tickets returns 400: {data['detail']}")
    
    def test_purchase_performance_small_batch(self, authenticated_client):
        """Test purchase of 100 tickets completes quickly (performance test)"""
        # Get 100 available numbers
        avail_response = authenticated_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        disponibles = avail_response.json()["disponibles"]
        if len(disponibles) < 100:
            pytest.skip(f"Not enough available numbers ({len(disponibles)}) for 100-ticket test")
        
        test_numbers = disponibles[:100]
        
        start_time = time.time()
        response = authenticated_client.post(
            f"{BASE_URL}/api/boletos/comprar",
            json={
                "sorteo_id": SORTEO_ID_20000,
                "numeros_boletos": test_numbers,
                "metodo_pago": "transferencia"
            }
        )
        elapsed = time.time() - start_time
        
        # Note: This might fail if user already purchased all tickets
        # or if sorteo is in waiting state with all tickets sold
        if response.status_code == 200:
            print(f"PASSED: 100-ticket purchase completed in {elapsed:.3f}s")
            assert elapsed < 2.0, f"Performance: 100-ticket purchase took {elapsed:.3f}s (expected < 2s)"
            data = response.json()
            print(f"  - Message: {data.get('message', 'N/A')}")
            print(f"  - Purchase ID: {data.get('purchase_id', 'N/A')}")
        elif response.status_code == 400:
            data = response.json()
            print(f"INFO: 100-ticket purchase returned 400 (expected if numbers occupied)")
            print(f"  - Detail: {data['detail']}")
            # This is acceptable for performance test if numbers got taken
        else:
            pytest.fail(f"Unexpected status code {response.status_code}: {response.text}")


class TestBulkValidationVsSingleComparison:
    """Compare performance of bulk vs single validation"""
    
    def test_bulk_vs_single_performance(self, api_client):
        """Verify bulk validation is faster than N single calls"""
        avail_response = api_client.get(f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/numeros-disponibles")
        if avail_response.status_code != 200:
            pytest.skip("Could not get available numbers")
        
        disponibles = avail_response.json()["disponibles"]
        if len(disponibles) < 20:
            pytest.skip("Not enough available numbers")
        
        test_numbers = disponibles[:20]
        
        # Time bulk validation
        start_bulk = time.time()
        bulk_response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"numeros": test_numbers}
        )
        bulk_time = time.time() - start_bulk
        
        # Time 20 individual validations
        start_single = time.time()
        for num in test_numbers:
            api_client.post(
                f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numero",
                json={"numero": num}
            )
        single_time = time.time() - start_single
        
        assert bulk_response.status_code == 200
        
        print(f"Performance comparison for 20 numbers:")
        print(f"  - Bulk validation: {bulk_time:.3f}s")
        print(f"  - 20 single validations: {single_time:.3f}s")
        print(f"  - Bulk is {single_time/bulk_time:.1f}x faster")
        
        # Bulk should be significantly faster
        assert bulk_time < single_time, "Bulk validation should be faster than individual calls"
        print("PASSED: Bulk validation is faster than individual calls")


class TestErrorHandling:
    """Tests for error handling in bulk operations"""
    
    def test_bulk_validation_invalid_json(self, api_client):
        """Test bulk validation handles invalid JSON gracefully"""
        # Send invalid JSON
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            data="not json"
        )
        # Should return 422 or 400 for invalid JSON
        assert response.status_code in [400, 422]
        print(f"PASSED: Invalid JSON returns {response.status_code}")
    
    def test_bulk_validation_missing_numeros_field(self, api_client):
        """Test bulk validation handles missing numeros field"""
        response = api_client.post(
            f"{BASE_URL}/api/sorteos/{SORTEO_ID_20000}/validar-numeros-bulk",
            json={"other_field": [1, 2, 3]}
        )
        # Should return empty list for missing field or handle gracefully
        assert response.status_code == 200
        data = response.json()
        assert data["todos_disponibles"] == True  # Empty list = all available
        print("PASSED: Missing numeros field handled gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
