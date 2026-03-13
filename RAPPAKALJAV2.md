## Plan for version 2 of Rappakalja application

# Current challenges
- There are two different roles, master and player. Problem comes from one device must be only master and rest are players so we need player count + 1 devices when playing and master device rotates.
	- Solution is support for two roles in one device, so one is game master at time and selects next master from players when round ends
- The frontend app is polling a lot when requesting new answers and poll when the new rounds begin.
	- Maybe websockets could we used?
- The session based backend is bit old school. Maybe we could use something more modern.
- The frontend app is really old and quite ugly, maybe we should re-design whole UI.
- There aren't any tests currently.
- The hosting, where we could host this application? We should consider all challenges when deciding where to host.
