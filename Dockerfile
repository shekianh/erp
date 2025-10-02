Ação
Commit: Add files via upload 
##########################################
### Download Github Archive Started...
### Thu, 02 Oct 2025 17:45:29 GMT
##########################################

#0 building with "default" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.30kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:20-alpine
#2 DONE 0.4s

#3 [internal] load .dockerignore
#3 transferring context: 2B done
#3 DONE 0.0s

#4 [builder 1/7] FROM docker.io/library/node:20-alpine@sha256:eabac870db94f7342d6c33560d6613f188bbcf4bbe1f4eb47d5e2a08e1a37722
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 4.11kB done
#5 DONE 0.0s

#6 [stage-1 3/7] WORKDIR /app
#6 CACHED

#7 [stage-1 2/7] RUN apk add --no-cache     cairo     jpeg     pango     giflib     pixman
#7 CACHED

#8 [stage-1 4/7] COPY package*.json ./
#8 CACHED

#9 [builder 3/7] WORKDIR /app
#9 CACHED

#10 [builder 5/7] RUN npm ci
#10 CACHED

#11 [builder 2/7] RUN apk add --no-cache     python3     make     g++     cairo-dev     jpeg-dev     pango-dev     giflib-dev     pixman-dev
#11 CACHED

#12 [builder 4/7] COPY package*.json ./
#12 CACHED

#13 [builder 6/7] COPY . .
#13 CACHED

#14 [builder 7/7] RUN npm run build
#14 CACHED

#15 [stage-1 5/7] RUN npm ci --only=production
#15 CACHED

#16 [stage-1 7/7] COPY --from=builder /app/server.js ./server.js 2>/dev/null || true
#16 ERROR: failed to calculate checksum of ref 7f15017a-c17f-4735-b737-93d7fe6e3a3a::l45desqtpclq35cbbgnhzgzig: "/||": not found

#17 [stage-1 6/7] COPY --from=builder /app/dist ./dist
#17 CANCELED
------
 > [stage-1 7/7] COPY --from=builder /app/server.js ./server.js 2>/dev/null || true:
------
Dockerfile:54
--------------------
  52 |     
  53 |     # Copy any server files if they exist
  54 | >>> COPY --from=builder /app/server.js ./server.js 2>/dev/null || true
  55 |     
  56 |     # Expose port
--------------------
ERROR: failed to build: failed to solve: failed to compute cache key: failed to calculate checksum of ref 7f15017a-c17f-4735-b737-93d7fe6e3a3a::l45desqtpclq35cbbgnhzgzig: "/||": not found
##########################################
### Error
### Thu, 02 Oct 2025 17:45:30 GMT
##########################################

Command failed with exit code 1: docker buildx build --network host -f /etc/easypanel/projects/erp/app/code/Dockerfile -t easypanel/erp/app --label 'keep=true' --build-arg 'GIT_SHA=391a8a23fd4c174b848766b4459b7e316ca7ccf5' /etc/easypanel/projects/erp/app/code/
