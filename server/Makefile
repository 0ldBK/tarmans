ROOT_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

create:
	docker run -tid -w /app -v $(ROOT_DIR):/app --net=host --restart=always --name=plugin-server alpine:latest ./docker-start.sh

restart:
	docker restart plugin-server

rebuild-flag:
	touch ./.reinstall

rebuild: rebuild-flag restart
