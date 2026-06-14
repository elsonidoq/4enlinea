CXX=g++
CXXFLAGS=--std=c++17 -W -Wall -O3 -DNDEBUG
SERVER_DIR=../server

SRCS=Solver.cpp
OBJS=$(subst .cpp,.o,$(SRCS))

c4solver:$(OBJS) main.o
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o c4solver main.o $(OBJS) $(LDLIBS)
	cp c4solver $(SERVER_DIR)/c4solver

generator: generator.o
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o generator generator.o $(LDLIBS)

.depend: $(SRCS)
	$(CXX) $(CXXFLAGS) -MM $^ > ./.depend
	
-include .depend

test: $(OBJS) test_explain.o
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o test_explain test_explain.o $(OBJS) $(LDLIBS)
	./test_explain

test_depth: $(OBJS) test_depth.o
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o test_depth test_depth.o $(OBJS) $(LDLIBS)
	./test_depth

clean:
	rm -f *.o .depend c4solver generator test_explain test_depth


