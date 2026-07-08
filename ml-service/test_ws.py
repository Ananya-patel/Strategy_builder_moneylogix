import asyncio
import websockets

async def main():
    async with websockets.connect("ws://localhost:8000/ws/options-chain/NIFTY") as ws:
        for _ in range(3):
            print(await ws.recv())

asyncio.run(main())
